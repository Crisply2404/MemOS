# PROJECT_LOG — MemOS 实施记录（保姆级）

这份文档的目标：用小白也能看懂的方式，记录我们**每一步做了什么、为什么这么做、原理是什么**。

> 约定：
>
> - **前端** = 你现在的 React 控制台
> - **后端** = `server/` 下的 FastAPI（Memory Controller）
> - **L1** = Redis（短期会话记忆）
> - **L2** = Postgres + pgvector（长期语义记忆）
> - **Worker** = 后台任务（压缩/摘要/去重等慢工作）

---

## 0. 我们在做什么（一句话）

做一个“记忆管家服务”（Memory-as-a-Service）：

1. 把你每次对话/事件先**记下来**（`ingest`）
2. 你需要回答问题时，从记忆里**找相关内容**（`query`）
3. 太长的内容在后台**压缩成摘要**（`condensation`），减少 Token 成本

---

## 1. 初始化仓库文档（README）

**做了什么**

- 把仓库里原先的模板 README（AI Studio 模板）替换为 MemOS 的项目介绍、UI 现状与后端路线。

**为什么这么做**

- 你要投 Agent 应用开发岗，README 是面试官第一眼看到的内容：它必须和你现在的 UI/代码一致。

**原理**

- README 不是“概念堆砌”，而是“可验证的事实 + 可执行的路线图”。

---

## 2. 选择技术栈（方案 B）

**做了什么**

- 决定后端采用：`FastAPI + Redis + Postgres(pgvector) + RQ`。

**为什么这么做**

- Agent 应用开发岗更看重：RAG/记忆治理/评测闭环。
- Python 生态对摘要、实体抽取、评测脚本更友好。
- Redis + Postgres 是最常见、最容易复现的组合。

**原理**

- FastAPI 提供 HTTP API（像“服务窗口”）。
- Redis 提供“短期记忆 + 任务队列后端”。
- Postgres 提供“长期记忆 + 审计 + 向量检索”。

---

## 3. 后端目录结构与依赖清单（`server/`）

**做了什么**

- 新增 `server/` 作为后端目录。
- 添加 Python 依赖清单：`server/pyproject.toml`。
- 添加后端说明：`server/README.md`。

**为什么这么做**

- 前端和后端关注点不同，分目录能保持清晰。
- `pyproject.toml` 是依赖“购物清单”，别人按它就能复现。

**原理**

- `pip install -e .` 会根据 `pyproject.toml` 安装依赖并让代码“可编辑生效”。

---

## 4. 本地基础设施：Postgres + Redis（docker-compose）

**做了什么**

- 添加 `docker-compose.yml`：一键启动 Postgres（带 pgvector）和 Redis。
- 添加 DB 初始化脚本：
  - `server/db/init/001-enable-pgvector.sql` 启用向量扩展
  - `server/db/init/010-schema.sql` 创建表结构

**为什么这么做**

- 你不需要在系统里手动安装 Postgres/Redis，Docker 负责跑它们。
- `pgvector` 让 Postgres 能做“向量相似度检索”（RAG 的基础）。

**原理**

- docker 容器启动时会执行 `docker-entrypoint-initdb.d` 里的 SQL：第一次初始化就把扩展和表建好。

---

## 5. 数据库表（我们存了什么）

**做了什么**

- 在 Postgres 创建三张表：
  - `memories`：长期记忆（文本 + 元数据 + embedding）
  - `condensations`：摘要压缩结果（原 token vs 压缩 token）
  - `audit_logs`：审计日志（系统做了什么决策）

**为什么这么做**

- `memories` 是核心：没有它就没有“长期记忆”。
- `condensations` 用来证明“省 token”的结果（可量化）。
- `audit_logs` 让系统“可解释/可追责”，面试很加分。

**原理**

- `memories.embedding` 是向量列（`vector(32)`），用于相似度检索。
- `ivfflat` 索引用于加速向量最近邻搜索。

---

## 6. L1：Redis 会话滑动窗口

**做了什么**

- 新增 `server/memos_server/l1_redis.py`：用 Redis list 存“最近 N 条消息”。

**为什么这么做**

- Agent 最常用的上下文就是“刚刚聊过的几句”。
- Redis 很快，适合做短期会话态。

**原理**

- 每个 `(namespace, session_id)` 对应一个 Redis key。
- `LPUSH` 插入新消息，`LTRIM` 保留最后 N 条，`EXPIRE` 设置 TTL 防止无限膨胀。

---

## 7. Option A：伪 embedding（先跑通链路）

**做了什么**

- 新增 `server/memos_server/embedding.py`：把文本变成一个**稳定的假向量**。

**为什么这么做**

- 你选择了 A：先不要外部模型/Key。
- 但我们仍然要把“向量检索路径”走通，才能尽快接前端。

**原理**

- 对文本做 SHA256 hash，再把 hash 映射成 [-1, 1] 的浮点数组。
- 它不是语义向量，但“同一句话每次生成的向量相同”，便于调试系统。

---

## 8. 后端 API：让 ingest/query 变成“真存真查”

**做了什么**

- 更新 `server/memos_server/app.py`：
  - `/v1/ingest`：写 Redis(L1) + 写 Postgres(L2) + 写审计日志
  - `/v1/query`：读 Redis(L1) + 用 pgvector 查 Postgres(L2) + 返回 raw_chunks + condensed_summary
  - `/v1/ops/stats`：返回最基础的全局统计（等 worker 落地后更准确）

**为什么这么做**

- 前端要从 mock 变成真实数据，必须先把 API 跑通。
- 先用“简易摘要（截断）”占位，后续再用 worker 做真正的 condensation。

**原理**

- `ingest`：
  - L1：把消息放进 Redis 的滑动窗口（短期）
  - L2：把消息存进 Postgres，并保存 embedding（长期）
- `query`：
  - 先拿 L1（最近对话）
  - 再用“向量距离”从 L2 找 topK 相近记忆（RAG 取材）
  - 返回给前端做 Raw vs Condensed 展示

---

## 9. 当前状态（你现在能做什么）

- ✅ Docker 已启动：Postgres + Redis
- ✅ 后端依赖已安装：`server/.venv`
- ✅ `ingest/query` 已接入 Redis + Postgres（Option A embedding）
- ⏳ Worker（RQ）尚未完成：真正的 condensation 还在下一步

---

## 10. Smoke Test（通过 Swagger 验证 ingest/query）

**做了什么**

- 通过 `http://localhost:8000/docs`（Swagger）手动验证了：
  - `POST /v1/ingest` 能写入两条消息（user + agent）
  - `POST /v1/query` 能返回 `raw_chunks` 和 `condensed_summary`

**为什么这么做**

- 在第一次 commit 前做最小验证，确保“里程碑可运行”。

**原理**

- `ingest`：写入 Redis(L1) + Postgres(L2)，并记录审计事件。
- `query`：读取 Redis 的会话滑动窗口（L1）+ 用 pgvector 在 Postgres 里做相似度检索（L2）。

**验证结果（示例现象）**

- `raw_chunks` 返回了两条 L2 记忆（分别来自 user/agent），说明 L2 写入与检索链路打通。
- `condensed_summary` 返回了 L1 + L2 拼接后的内容，说明“上下文拼装”结构已经成立。

---

## 11. 引入 RQ Worker（让 condensation 变成后台任务）

**做了什么**

- 增加 RQ 队列与 worker 入口：
  - `server/memos_server/queue.py`：创建名为 `condensation` 的队列
  - `server/worker.py`：启动 worker，监听并执行后台任务
- 增加 condensation 逻辑与数据库落盘：
  - `server/memos_server/condensation.py`：
    - 生成“结构化摘要（Memory Card）”（MVP 先用规则/启发式，后续可换 LLM）
    - 估算 token（粗略用字符数/4）
    - 把摘要与 token 对照写入 `condensations` 表
- 更新 `POST /v1/query` 行为：
  - 如果数据库里已有最新摘要：直接复用（更快、可重复展示）
  - 如果没有摘要：把摘要任务丢给队列，先返回 fallback（不阻塞 API）

**为什么这么做**

- 摘要/压缩属于“慢工作”，不能卡住用户每次查询（否则 UI 体验差、Agent 延迟高）。
- 任务落库后，Dashboard 才能累计真实的 token savings。

**原理**

- API（FastAPI）只负责“接请求、快速返回”。
- Worker（RQ）在后台慢慢跑任务：从 Redis 队列拿任务 → 执行 → 写入 Postgres。
- 下一次 query 就可以直接读最新 condensation 结果，实现“缓存/复用”。

**验证（通过）**

- 同一组 `namespace/session_id` 下连续触发两次 `POST /v1/query`：
  - 第一次：会 enqueue condensation 任务（worker 执行并落库）
  - 第二次：worker 无输出（正常，因为复用数据库里的最新摘要），API 直接返回相同的 `condensed_summary`

**踩坑记录（已修复）**

- 现象：运行 `python worker.py` 报错 `ImportError: cannot import name 'Connection' from 'rq'`。
- 原因：RQ 2.x 版本移除了 `Connection` 这种导入方式。
- 修复：直接用 `Worker(..., connection=redis_conn)` 传入连接即可。

---

## 12. 前端联调：RAG Debugger 从 mock 切到真实 API

**做了什么**

- 新增前端 API 封装：`utils/api.ts`，用 `fetch` 调用后端 `/v1/ingest` 和 `/v1/query`。
- 在 `App.tsx` 把原来“setTimeout + mock retrieval”的流程替换成真实调用：
  - 发送消息 → `POST /v1/ingest`
  - 然后立刻 `POST /v1/query`，拿到 `raw_chunks / condensed_summary / token_usage_*` 并渲染到右侧对比面板。
- 给 RAG Debugger 增加一个轻量错误提示条：如果后端没启动、CORS 不通或请求失败，UI 会显示错误信息，方便排查。

**为什么这么做**

- 只有把 UI 从 mock 切到真实 API，你的项目才从“后端跑通”升级成“可演示产品”。
- RAG Debugger 是最直观的展示位：它能一眼看到 raw chunks、condensed summary 以及 token 省了多少。

**原理是什么（小白版）**

- `ingest` 就像“记笔记”：把你这句用户输入写进 L1（Redis 最近对话）和 L2（Postgres 长期记忆）。
- `query` 就像“翻笔记”：把最近对话（L1）和相近记忆（L2 向量检索）拼成 raw，再用 worker 生成/复用摘要当 condensed。
- 前端只需要把后端返回的字段映射到 UI 上即可（raw vs condensed + token）。

**当前状态**

- ✅ RAG Debugger 已不依赖 `utils/mockData.ts` 的检索结果。
- ✅ 支持 `VITE_API_BASE_URL` 配置后端地址（默认 `http://localhost:8000`）。

**如何验证**

- 启动后端：`cd server && source .venv/bin/activate && uvicorn memos_server.app:create_app --factory --reload --port 8000`
- 启动 worker：`cd server && source .venv/bin/activate && python worker.py`
- 启动前端：`npm install && npm run dev`
- 打开 UI → RAG Debugger：发送消息后右侧出现真实的 Raw/Condensed；再次 query 会复用已落库摘要（worker 可能不再打印）。

---

## 13. 增加 Ops 端点：/v1/ops/pipeline 与 /v1/ops/audit

**做了什么**

- 新增两个运维/观测接口：
  - `GET /v1/ops/pipeline`：返回 condensation 队列长度 + 最近的 condensation 落库记录。
  - `GET /v1/ops/audit`：返回最近的审计事件（支持按 `namespace/session_id` 过滤）。

**为什么这么做**

- 你现在的系统虽然“能跑”，但缺少“可观测性”：
  - worker 是否有积压？
  - 最近到底生成了哪些摘要？
  - 系统做过哪些决策（ingest/query/condensation）？
- 有了这两个接口，前端的 Pipeline / Audit（后续页面）才能从 mock 逐步切换到真实数据。

**原理是什么（小白版）**

- `ops/pipeline` 就像“生产线看板”：队列里还有多少件没处理、最近加工出来了哪些摘要。
- `ops/audit` 就像“操作记录”：系统每次 ingest/query/condensation 都会记一条日志，方便追查与解释。

**如何验证**

- 启动后端：`cd server && source .venv/bin/activate && uvicorn memos_server.app:create_app --factory --reload --port 8000`
- 打开 Swagger：`http://localhost:8000/docs`
- 调用：
  - `GET /v1/ops/pipeline`
  - `GET /v1/ops/audit?limit=50`
  - 可选：`GET /v1/ops/audit?namespace=Project_X&session_id=...`

---

## 14. 前端 Pipeline 切真数据（对接 /v1/ops/pipeline）

**做了什么**

- 把 `MemoryPipeline` 页面从“定时造假数据”改成轮询后端真实数据：`GET /v1/ops/pipeline`。
- 左侧 Ingestion Stream 的 Pending 数量来自 condensation 队列长度（`queues[].count`）。
- 右侧 Structured Vault 展示最近 condensation 落库记录（`recent_condensations`），并计算 token 节省（`token_original - token_condensed`）。

**为什么这么做**

- 这个页面是你最适合“面试现场演示”的看板：能直观看到队列是否积压、worker 是否在产出摘要、以及 token savings 是否在累计。

**原理是什么**

- 后端把“系统运行状态”做成 ops 接口；前端只需要定时拉取并渲染即可。
- 这样前端不依赖 mock，也不会把演示变成“动画效果”，而是展示真实的系统行为。

**如何验证**

- 启动 compose：`docker compose up -d`
- 启动后端：`cd server && .venv\\Scripts\\python -m uvicorn memos_server.app:create_app --factory --reload --port 8000`
- 启动 worker：`cd server && .venv\\Scripts\\python worker.py`
- 启动前端：`npm run dev -- --port 3000`
- 在 RAG Debugger 发送几条较长消息触发 condensation → 打开 Pipeline 页面 → 观察 Pending 与 recent_condensations 列表变化。

---

## 15. 一键灌入演示数据（Seed Demo Data）

**做了什么**

- 新增后端接口：`POST /v1/dev/seed`
  - 可指定 `namespace/session_id`
  - 支持 `reset=true`：只清理该 `namespace/session_id` 下的 memories/condensations/audit_logs，再重新写入 demo 数据
- 在前端 RAG Debugger 顶部增加按钮：`Seed Demo Data`
  - 点一下就调用 `/v1/dev/seed`，让数据库立刻有可检索的“演示记忆”
  - 同时提供 `New Session`，一键生成新的 sessionId，避免历史数据干扰演示

**为什么这么做**

- 没有预置记忆时，观众不知道该问什么；演示会变成“空系统”。
- 一键 seed 可以把演示变成确定性流程：点一下 → 立刻可 query → 立刻能看 raw/condensed/pipeline。

**原理是什么**

- `dev/seed` 本质是批量执行多次“写入 memories（带 embedding）”并记录一条 `DEV_SEED` 审计事件。
- `reset=true` 只清理指定 slice（namespace+session）而不是清空整库，避免每次演示都要重建 docker volume。

**如何验证**

- 启动 compose：`docker compose up -d`
- 启动后端：`cd server && .venv\\Scripts\\python -m uvicorn memos_server.app:create_app --factory --reload --port 8000`
- 启动 worker：`cd server && .venv\\Scripts\\python worker.py`
- 启动前端：`npm run dev -- --port 3000`
- 打开 RAG Debugger：点击 `Seed Demo Data`，然后问：
  - “我踩过哪些坑？怎么解决？”
  - “下一步要做什么？为什么？”
  - “运行命令是什么？”

**什么时候需要 docker compose down -v**

- 只有当你想清空整个数据库（所有 namespace/session 的数据）时才需要。
- 常规演示只用 `POST /v1/dev/seed?reset=true` 即可“只保留 demo slice 的数据”。

---

## 16. 增加 Ops 端点 + CORS（让前端能拉真实运维数据）

**做了什么**

- 增加运维/观测接口：
  - `GET /v1/ops/pipeline`：队列长度 + 最近 condensation 落库记录。
  - `GET /v1/ops/audit`：审计事件列表（支持 `namespace/session_id/limit` 过滤）。
- 配置 CORS，允许本地前端（Vite dev server）直接从浏览器请求后端（避免被浏览器拦截）。

**为什么这么做**

- 没有 ops 端点时，前端只能“造数据”，演示缺乏可信度。
- 没有 CORS 时，即使后端接口存在，浏览器也会因为跨域策略拒绝请求，导致 UI 看起来像“接口坏了”。

**原理是什么（小白版）**

- `ops/*` 就像“运维看板 API”：把队列积压、最近产出、系统做过的动作（审计）直接暴露给 UI。
- CORS 是浏览器安全策略：前端网页从 `http://127.0.0.1:3000` 去请求 `http://127.0.0.1:8000` 属于跨域，后端必须显式允许。

**如何验证**

- 启动后端后打开 Swagger：`http://127.0.0.1:8000/docs`
- 调用：
  - `GET /v1/ops/pipeline`
  - `GET /v1/ops/audit?limit=50`
- 启动前端：`npm run dev -- --port 3000`
  - 打开浏览器 DevTools Network：应当能看到请求成功（不是 CORS error）。

---

## 17. 前端审计面板 + 一键验收脚本（把“可解释性”做成可演示能力）

**做了什么**

- 前端增加一个 Audit Logs 视图：拉取 `GET /v1/ops/audit` 并以表格形式展示。
- 增加 API 级别的“端到端自检/验收脚本”，让演示可重复：
  - 自动触发 ingest/query
  - 再读取 ops/audit、ops/pipeline
  - 用输出证明系统真的在写审计、真的在跑队列/落库

**为什么这么做**

- 面试官问“怎么排查/怎么解释系统决策”时，审计面板是最直观的答案。
- 纯手工点 UI 很容易漏步骤；脚本让你在任何机器上 1 分钟复现演示闭环。

**原理是什么（小白版）**

- 后端每次 ingest/query/condensation 都会写一条 `audit_logs`；前端只是把它读出来并展示。
- 验收脚本就是把 Swagger 的人工步骤自动化：用固定输入跑一遍，然后打印关键结果。

**如何验证**

- 打开 UI -> `Audit Logs`：点击 `Refresh`，应当能看到 `INGEST/QUERY/...` 事件。
- 或直接用脚本跑一遍（仓库里现有的 verify 类脚本）：
  - 运行后应当能看到 audit 事件数量变化，以及 pipeline/audit 的返回结构。

---

## 18. 结构化摘要升级：Memory Card（压缩结果变“可读的产品卡片”）

**做了什么**

- 把 condensation 的输出从“截断文本”升级为稳定的结构化 JSON（Memory Card）。
- 前端 RAG Debugger 支持解析该 JSON，并用更像产品的方式展示（列表/分区），而不是把 JSON 当纯文本。

**为什么这么做**

- 演示时“省 token”只是第一步；面试官更关心：系统到底提取了哪些关键信息、未来怎么复用。
- 结构化卡片能把“踩坑/解决方案/常用命令/约束”等信息变成可复用资产，比一段长摘要更像真实的 Memory Controller。

**原理是什么（小白版）**

- Worker 生成一个有固定字段的 JSON（例如 `risks[]`、`actions[]` 等）。
- `condensed_summary` 仍然是一个字符串字段，但它的内容是 JSON 文本；前端识别到 `schema` 后按字段渲染。
- 好处是：字段稳定、可版本化、未来可替换生成方式（规则版 -> LLM 版）但 UI 不需要大改。

**如何验证**

- 在同一 session 下触发一次 query 让 worker 落库摘要。
- 再次 query：返回的 `condensed_summary` 应该以 `{` 开头，且能解析出 `schema: memos.memory_card.*`。
- 打开 UI 的 RAG Debugger：右侧 Condensed 会显示结构化区域（例如 Risks / Actions），而不是一大段原始文本。

---

## 19. 观测与演示隔离：Reset Session + 审计视角（Session/Namespace/All）

**做了什么**

- 新增会话重置接口：`POST /v1/sessions/reset`。
  - 必须显式 `confirm=true` 才会执行，避免误触。
  - 支持 `dry_run=true` 先看将删除的数量。
  - 默认清理该 session 的 L1（Redis）+ L2（Postgres 的 `memories/condensations`）。
  - 默认不清理旧审计日志，并写入一条 `SESSION_RESET` 事件；如需彻底清理可传 `clear_audit=true`。
- 前端把演示相关的控制入口收敛到一个菜单（Options），包括：切换 namespace、seed demo data、新建会话、重置会话。
- Audit Logs 增加 scope 切换：
  - Session：只看当前会话
  - Namespace：看当前 namespace 下所有会话
  - All：看所有 namespace（更符合 Memory-as-a-Service 视角）

**为什么这么做**

- 演示最怕“历史数据污染”：你以为在演示新一轮对话，实际上 UI/检索还在复用旧 session 的摘要与审计。
- Reset Session 是“把当前会话清干净”的最直接工具；而 scope 切换能解释清楚“数据没丢，只是你切了 workspace（namespace）”。

**原理是什么（小白版）**

- L1 是 Redis 里按 `(namespace, session_id)` 存的滑动窗口 key；删除 key 就等于清空短期记忆。
- L2 是 Postgres 里按 `(namespace, session_id)` 存的行；按条件 DELETE 就只会清指定会话。
- audit 之所以默认保留：审计用于解释“系统做过什么”，清掉它会丢失最有价值的可解释信息；但仍提供 `clear_audit` 以适配极端演示场景。

**如何验证**

- 触发一组 ingest/query，确保 audit 有 `INGEST/QUERY`。
- 调用 `POST /v1/sessions/reset`（confirm=true），然后：
  - `GET /v1/ops/audit?namespace=...&session_id=...` 能看到新增的 `SESSION_RESET`。
  - 同 session 再 query：不会复活旧的 condensation；表现为新会话从零开始。
- 在 UI 的 Audit Logs：切换 scope 到 Namespace/All，能看到不同 namespace/会话的历史事件。


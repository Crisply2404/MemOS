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
    - 生成“简易摘要”（MVP 先用截断，后续可换 LLM）
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

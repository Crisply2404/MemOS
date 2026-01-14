# ROADMAP_TODO — 小步任务清单（持续更新）

这份文档的目标：把 Todo 拆成“小步可验证”的清单，你每做完一步都能明确知道“完成了什么、如何验证”。

> 状态标记：
>
> - [x] 已完成
> - [ ] 未完成

---

## 已完成

- [x] 前端现状梳理 + README 对齐

  - 验证：打开 `README.md`，内容与当前 UI 视图（Dashboard/Pipeline/Radar/RAG Debugger）一致。

- [x] 后端骨架（FastAPI + Pydantic models + settings）

  - 验证：在 `server/` 下能 import `memos_server.app:create_app`。

- [x] 本地基础设施（Postgres + Redis）

  - 验证：`docker compose ps` 显示两个服务 Up；Postgres 里能看到 `vector` 扩展与三张表。

- [x] 存储层 MVP（L1 Redis + L2 Postgres + Option A embedding）
  - 验证：调用 `/v1/ingest` 后 `memories` 表有数据；调用 `/v1/query` 能返回 `raw_chunks`。

---

## 进行中（下一步）

- [x] 启动 FastAPI 服务并用 Swagger 验证接口

  - 命令（示例）：`cd server && source .venv/bin/activate && uvicorn memos_server.app:create_app --factory --reload --port 8000`
  - 验证：浏览器打开 `http://localhost:8000/docs`，能看到 `/v1/ingest`、`/v1/query`。

- [x] Smoke Test（最小验证）

  - 目标：确认服务能启动，且 `/health`、`/v1/ingest`、`/v1/query` 跑通。
  - 验证步骤：
    - 1. 启动服务：`cd server && source .venv/bin/activate && uvicorn memos_server.app:create_app --factory --port 8000`
    - 2. 打开文档：`http://localhost:8000/docs`
    - 3. 在 Swagger 里依次调用：
      - `POST /v1/ingest` 写入 2 条消息（user/agent）
      - `POST /v1/query` 查询并观察返回的 `raw_chunks` 和 `condensed_summary`

- [x] 实现 RQ Worker（真正的 condensation）

  - 目标：把“摘要生成”放到后台，写入 `condensations` 表，并累积 token savings。
  - 验证：执行一段 ingest 后，触发 worker 任务；`condensations` 表出现新记录。

  - 本地运行 worker：
    - `cd server && source .venv/bin/activate && python worker.py`
  - 验证方式（推荐）：

    - 1. 先调用 `POST /v1/query`（会自动 enqueue 任务）
    - 2. 观察 worker 终端输出有 job 执行
    - 3. 再次调用 `POST /v1/query`，看到 token*usage*\* 来自已落库摘要（更稳定）

  - 常见现象（正常）：
    - 第一次 `query` 会 enqueue 任务，因此 worker 会打印“Job OK”。
    - 之后再次 `query` 如果复用了最新摘要（无需重新生成），worker 可能不再打印任何内容。

- [ ] 增加 `/v1/ops/pipeline` 与 `/v1/ops/audit`
  - 目标：让前端 Pipeline/Audit 页面能拉到真实数据。
  - 验证：请求能返回队列长度、最近任务、最近审计事件。

  - 验证方式（示例）：
    - 1. 启动后端：`cd server && source .venv/bin/activate && uvicorn memos_server.app:create_app --factory --reload --port 8000`
    - 2. 打开 Swagger：`http://localhost:8000/docs`
    - 3. 调用 `GET /v1/ops/pipeline`：能看到 `queues[0].count`（condensation 队列长度）和 `recent_condensations`（最近摘要落库）。
    - 4. 调用 `GET /v1/ops/audit?limit=50`：能看到最近的 `INGEST/QUERY/CONDENSATION` 事件。
    - 5. 可选过滤：`GET /v1/ops/audit?namespace=Project_X&session_id=...`

---

## 待做（前端联调）

- [x] 前端从 mockData 切换到真实 API（先打通 RAG Debugger）

  - 目标：RAG Debugger 先跑通（最直观）。
  - 验证：
    - 1. 启动后端：`cd server && source .venv/bin/activate && uvicorn memos_server.app:create_app --factory --reload --port 8000`
    - 2. 启动 worker（用于生成摘要并复用）：`cd server && source .venv/bin/activate && python worker.py`
    - 3. 启动前端：`npm install && npm run dev`
    - 4. 打开 UI（RAG Debugger）：发送消息后，右侧 Raw vs Condensed 来自 `/v1/ingest` + `/v1/query`，不再使用 `utils/mockData.ts`。
    - 5. 再次发送同一会话的 query：若摘要已落库，`condensed_summary` 会复用（worker 可能不再打印）。

- [ ] 端到端演示脚本
  - 目标：给面试官 1 分钟演示：存记忆 → 查记忆 → 省 token → 看审计。

---

## 待做（面试性价比最高优先级）

下面这些是从“面试产出最大”角度排的优先级：先把可演示闭环做扎实，再补工程化/评测。

### P0（最该先做，产出最大）

- [x] TODO 1：MemoryPipeline 页面切真数据（接 `/v1/ops/pipeline`）

  - 为什么：UI 一眼能看到队列积压、最近 condensation、token savings，演示非常强。
  - 验收：打开 Pipeline，左侧 Pending 来自 `queues[0].count`；右侧能列出 `recent_condensations`，并显示 token 节省。
  - 验证步骤（Windows/pwsh 示例）：
    - 1. 启动 compose：`docker compose up -d`
    - 2. 启动后端：`cd server && .venv\Scripts\python -m uvicorn memos_server.app:create_app --factory --reload --port 8000`
    - 3. 启动 worker：`cd server && .venv\Scripts\python worker.py`
    - 4. 启动前端：`npm run dev -- --port 3000`
    - 5. 在 RAG Debugger 发几条较长消息触发 condensation
    - 6. 打开 Pipeline 页面：观察 Pending/Recent condensations 跟随变化

- [ ] TODO 2：最小“端到端演示脚本”（1 分钟版）

  - 为什么：面试官最喜欢“我现在给你跑一下”。
  - 验收：README 或 docs 里有固定步骤：启动 compose → 启动 API → 启动 worker → 启动前端 → 发送 3 条长消息 → 看到省 token → 看到 pipeline/audit 数据变化。

- [ ] （可选）一键 Seed Demo Data（用于演示）

  - 目标：不用手动打字灌入记忆；点一下按钮即可在指定 `namespace/session_id` 下写入一组演示用 memories。
  - 验证：
    - 1. 启动后端/前端
    - 2. 打开 RAG Debugger，点击 `Seed Demo Data`
    - 3. 再输入问题（例如“我踩过哪些坑？”）能立刻检索到 demo 数据并触发 condensation
  - 备注：
    - 如果只想保留 seed 数据：优先使用固定的 demo `namespace/session_id` 并用 `reset=true` 重置该 slice。
    - 只有在想清空所有历史数据时才需要 `docker compose down -v`（会清空整个数据库卷）。

### P1（贴 JD 的工程化/可解释性，少量工作高收益）

- [ ] TODO 3：前端加一个轻量 Audit 面板（不必做完整页面）

  - 为什么：回答“系统做了什么决策、怎么排查”的追问。
  - 验收：UI 能显示最近 20 条 `INGEST/QUERY/CONDENSATION` 事件（接 `/v1/ops/audit`），支持按 session 过滤。

- [ ] TODO 4：评测/回归脚本（本地可跑，不用 CI 也行）

  - 为什么：直接命中 JD 的“持续评估与实验/评测体系”。
  - 验收：跑脚本输出：查询延迟、condensation 命中率、token savings、topK 命中（至少能稳定复现一份结果）。

### P2（让“记忆治理”更像项目描述里的样子）

- [ ] TODO 5：把 condensation 从“截断”升级为“结构化摘要”（或至少“关键句优先”）

  - 为什么：结构化摘要能更好地沉淀“偏好/事实/任务/约束”，更像真实 Memory Controller。
  - 验收：`condensed_summary` 变成固定结构（比如 JSON 或带小标题文本），或至少能稳定保留“踩坑/原因/解决/命令/端口”等关键信息。

- [ ] TODO 6：Namespace/Session 的“演示隔离”功能（Reset Session）

---

## 待做（更像业界的路线：让它“看起来更聪明”）

下面这些任务是为了让系统从“可跑 MVP”升级到“更接近业界 Agent Memory 形态”：
核心目标是 **结构化记忆 + 可控召回 + 可评测**。

### A. Condensation（业界做法：结构化 + 可复用）

- [ ] A1：结构化摘要 schema（Memory Card）

  - 目标：condensation 输出固定结构，而不是一段截断文本。
  - 建议字段：
    - `facts[]`（事实/状态）
    - `preferences[]`（用户偏好）
    - `constraints[]`（约束/规则）
    - `decisions[]`（决策）
    - `pitfalls[]`（踩坑/错误/原因/解决）
    - `commands[]`（关键命令/端口/配置）
  - 验收：同一 session 的 `condensed_summary` 里能稳定出现 “5432/postgres/password/CORS” 相关 pitfall，并能展示为条目。

- [ ] A2：condensation 版本化与可回放

  - 目标：每次 condensation 记录 `version` 与 `inputs`（memory_ids/时间范围/触发原因），便于评测与回滚。
  - 验收：`condensations` 表能区分不同版本，UI 能展示最新版本并可查看历史。

- [ ] A3：触发策略（什么时候做 condensation）

  - 目标：从“每次 query 没摘要就 enqueue”升级到可控策略：
    - 例如：L1 长度/Token 超阈值、会话 idle、每 N 条消息、或显式触发。
  - 验收：audit 里能看到触发原因；不会频繁重复生成。

### B. Retrieval（业界做法：多路召回 + 解释性）

- [ ] B1：Query 分解（Query → facets）

  - 目标：把用户 query 拆成：`topic` / `time` / `entities` / `preference` / `task` 等维度（规则版或 LLM 版）。
  - 验收：rerank_debug 或 audit 里能看到 facets；检索结果更稳定。

- [ ] B2：混合检索（Hybrid: BM25 + Vector）

  - 目标：补一个关键词检索通道（BM25/tsvector）与向量检索融合，降低“短 query 只命中自己”的问题。
  - 验收：短 query（例如“交付日期”“踩坑”）不再只返回同句；能召回相关历史。

- [ ] B3：Rerank（可解释打分）

  - 目标：对 raw_chunks 做 rerank（例如：recency + similarity + importance + role boost）。
  - 验收：`rerank_debug` 里能看到每个组件的贡献，面试可解释。

### C. Memory Governance（TTL/去重/冲突）

- [ ] C1：重要性评分（importance）落地

  - 目标：不是写死 importance，而是根据角色/关键词/重复度/用户显式 pin 来计算。
  - 验收：audit 里能看到 importance 计算来源；低价值信息能被清理。

- [ ] C2：去重与冲突检测（写入时）

  - 目标：新记忆写入前做相似度检测：重复 → 合并/忽略；冲突 → 标记冲突。
  - 验收：重复 ingest 不膨胀；冲突在 audit/ops 能看见。

### D. Eval（业界做法：可量化）

- [ ] D1：离线评测脚本（固定数据集 + 指标）

  - 指标建议：recall@k、condensation 命中率、token savings、p95 latency。
  - 验收：一条命令跑完输出 JSON/Markdown 报告，能用来对比版本。

### E. Demo（让“看起来聪明”的呈现）

- [ ] E1：RAG Debugger 增加“结构化摘要视图”

  - 目标：右侧 Condensed 不只是一段文本，而是 Facts/Preferences/Pitfalls/Commands 分栏。
  - 验收：观众能一眼看到“系统提取了哪些关键信息”，更像业界产品。

  - 为什么：避免旧数据污染演示（例如历史数据混入检索结果）。
  - 验收：点一下按钮就换 sessionId，UI 清空，后端新会话干净。

### P3（可选加分项，看时间）

- [ ] TODO 7：Embedding provider 可切换（fake/local/api），保留回退

  - 为什么：展示你能对接主流 embedding/向量化，但又不牺牲可复现性。
  - 验收：配置一个 env 就能切换 embedding 实现，并且系统仍能跑通。

- [ ] TODO 8：简单“去重/冲突检测”策略（写入时检测相似度阈值）

  - 为什么：对齐“防污染机制”，也能讲工程权衡。
  - 验收：重复 ingest 不会无限膨胀，audit 里能看到 “dedup hit”。

---

## 版本控制（Commit 节奏提醒）

建议把 commit 颗粒度控制在“一个可运行里程碑”。建议节奏如下：

- 里程碑 1：`backend-mvp-storage`（已达成）

  - 内容：compose + 表结构 + L1 Redis + ingest/query 真存真查
  - 建议现在就 commit（见本文档下方建议）。

- 里程碑 2：`worker-condensation`（完成 RQ worker 后）
- 里程碑 3：`ops-endpoints`（pipeline/audit/stats 完整）
- 里程碑 4：`frontend-api-integration`（前端切真 API）

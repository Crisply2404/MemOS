# MemOS — 分布式 Agent 记忆与上下文治理引擎（Memory-as-a-Service）

一句话卖点：将“记忆管理”从 Agent 业务逻辑中剥离，提供一个独立的 Memory Controller 微服务，解决长对话的上下文污染、Token 成本爆炸与记忆遗忘策略难题，并提供可观测的运维控制台（Ops Console）。

> 当前仓库包含：
>
> - 前端控制台（Vite + React）：System Overview / Memory Pipeline / Semantic Radar / RAG Debugger
> - 后端：FastAPI + Worker + Redis + Postgres(pgvector)，用于提供 **L1/L2 可验证的记忆服务**；L3 Entity Graph 为规划项（README 中会明确标注）

## 前端已实现的可视化（以当前代码为准）

- **System Overview**：全局指标（Total Memories / Active Contexts / Token Savings / Compression Ratio）与 L1/L2/L3 健康度面板。
- **Memory Pipeline**：实时摄取 → 会话摘要（Session Summary / Condensation）→ 实体抽取（Entity Graphing）→ 结构化入库（Vault）链路观测。
- **Semantic Radar**：以“雷达扫描/相关性 blips”展示检索候选与 rerank/过滤效果（强调可解释检索）。
- **RAG Debugger**：并排对照 Retrieved Raw Context vs Working Memory（Context Pack），用于解释“本次 query 的上下文是怎么拼出来的”。

> 注：仓库内也包含 `CortexVisualizer`（3D 点云）与 `MemoryHeatmap`（衰减热力图）组件，但目前尚未接入主视图；后端打通 embedding 与衰减数据后会重新接入。

## 系统架构（目标形态）

## 当前实现 vs 目标形态（面试讲解用）

| 主题 | 当前实现（可验证） | 目标形态（规划） |
|------|--------------------|------------------|
| API 路径 | 以 `/v1/*` 为准（见 `/docs`） | 保持 `/v1/*`，逐步补齐 `/v1/policy` 等 |
| L1 Scratchpad | Redis 滑动窗口（会话级） | 更完整的 TTL/衰减与策略化治理 |
| L2 Semantic Store | Postgres + pgvector，deterministic fake embedding（跑通闭环、可解释） | 真实 embedding + rerank + 评测闭环 |
| L3 Entity Layer | 未实现（README 标注为规划） | 实体/关系抽取与纠偏（可扩展 Neo4j） |
| Semantic Radar | 基于真实 `/v1/query` 结果可视化候选与 rerank（MVP 为确定性启发式） | Cross-Encoder rerank + 过滤原因可解释 |
| Pipeline/Vault | 基于 condensation 结构化产物展示 token savings 与结构化卡片 | 实体图谱与更丰富的治理链路观测 |

### Memory Controller（独立微服务）

把记忆的写入、检索、压缩、淘汰、审计从 Agent 中抽离出来，通过 API 暴露给业务 Agent。前端控制台用于观察系统吞吐、成本与治理效果。

### 分层存储（L1/L2/L3）

- **L1 Scratchpad（Redis）**：毫秒级读写，保存会话滑动窗口上下文（支持 TTL）。
- **L2 Semantic Store（Postgres + pgvector / Vector DB）**：保存历史交互与摘要，用于向量检索 + 元数据过滤。
- **L3 Entity Layer（MVP 先用 Postgres 关系表，后续可扩展 Neo4j）**：抽取关键实体与关系，用于纠偏语义漂移、提升高精度召回。

### 动态治理策略

- **重要性评分 + TTL/衰减**：自动清理低价值信息，防止 Memory 膨胀。
- **Session Summary Worker（异步）**：按策略将 episodic memory（会话交互）压缩成 session summary 快照写入 DB，并产出 token savings 指标。
- **去重/冲突检测**：向量相似度阈值 + 元数据规则，减少冗余并避免跨 namespace 污染。

## 开发路线（Agent 应用开发岗取向）

1. **定义 API 契约**：以真实实现为准：`/v1/ingest`、`/v1/query`、`/v1/ops/stats`、`/v1/ops/pipeline`、`/v1/ops/audit`、`/v1/ops/condensations`、`/v1/ops/context_packs`、`/v1/ops/procedural`、`/v1/sessions/reset`；`/v1/policy` 为规划项。
2. **落地最小可用后端**：FastAPI + Redis(L1) + Postgres/pgvector(L2)；完成端到端写入与查询。
3. **实现 Worker 治理链路**：session summary（condensation）、去重/冲突检测、importance/decay，并在审计日志里可解释。
4. **检索与 rerank 可解释输出**：返回每条 chunk 的来源层级、分数组成与过滤原因，支撑 Radar/RAG Debugger。
5. **离线评测闭环**：Recall@k/MRR、Token Savings、Pollution Rate（跨 namespace 误召回率），写入 README 作为可验证成果。

## Run (Docker)

一条命令启动全栈（Postgres + Redis + API + Worker + Web UI）：

```bash
docker compose up --build
```

开发时的热重载（前端）

- `web` 容器运行的是 `vite dev`，并且通过 bind mount 挂载源码目录，因此你在本机编辑 `*.tsx/*.ts` 后，浏览器会自动热更新。
- Windows + Docker Desktop 场景下文件变更通知可能不稳定，本项目已启用 polling（牺牲少量 CPU 换稳定 HMR）。

开发时的热重载（后端 API / Worker）

- `api` 容器以 `uvicorn --reload` 运行，并挂载了 `./server` 源码目录：你修改 `server/memos_server/*.py` 后，API 会自动重载。
- `worker` 容器同样挂载了 `./server`：
	- 修改任务处理函数（例如 condensation 逻辑）后，通常对“后续新任务”会生效；
	- 如果你修改了 worker 进程自身的启动/初始化逻辑，建议执行 `docker compose restart worker` 以确保进程完全加载新代码。

打开：

- UI: http://127.0.0.1:3000
- API: http://127.0.0.1:8000/docs

停止：

```bash
docker compose down
```

如果你只想“停服务但保留数据卷”，用上面的 `down` 即可；如果你想彻底清空 Postgres 数据用于干净演示：

```bash
docker compose down -v
```

---

## Run (Local Dev)

日常开发建议本地跑（更快、更好 debug），数据库/Redis 仍用 docker 提供。

1) 启动依赖（Postgres + Redis）：

```bash
docker compose up -d postgres redis
```

2) 启动后端 API（Windows PowerShell 示例）：

```bash
cd server
.venv\Scripts\python -m uvicorn memos_server.app:create_app --factory --reload --port 8000
```

3) 启动 worker（用于 condensation）：

```bash
cd server
.venv\Scripts\python worker.py
```

4) 启动前端：

```bash
npm run dev -- --port 3000
```

打开：

- UI: http://127.0.0.1:3000
- API: http://127.0.0.1:8000/docs

---

## Demo (1-minute)

目标：1 分钟演示 “存记忆 -> 查记忆 -> 触发 session summary -> 省 token -> 看 pipeline/audit”。

1) 打开 UI：http://127.0.0.1:3000
2) 点击 `New Session`（保证演示隔离）
3) 点击 `Seed Demo Data`
4) 在 RAG Debugger 输入一个问题（示例：`我踩过哪些坑？`）触发检索与 session summary 刷新
5) 打开 `Pipeline` 页面：观察队列与 recent condensations 更新
6) 可选：打开 API 文档并查看审计：http://127.0.0.1:8000/docs -> `GET /v1/ops/audit`

## Docs

- 项目知识库（面试讲解 SSOT）：`helloagents/INDEX.md`

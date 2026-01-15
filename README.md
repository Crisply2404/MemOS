# MemOS — 分布式 Agent 记忆与上下文治理引擎（Memory-as-a-Service）

一句话卖点：将“记忆管理”从 Agent 业务逻辑中剥离，提供一个独立的 Memory Controller 微服务，解决长对话的上下文污染、Token 成本爆炸与记忆遗忘策略难题，并提供可观测的运维控制台（Ops Console）。

> 当前仓库包含：
>
> - 前端控制台（Vite + React）：System Overview / Memory Pipeline / Semantic Radar / RAG Debugger
> - 后端（规划中）：FastAPI + Worker + Redis + Postgres(pgvector)，用于提供真实的 L1/L2/L3 记忆服务与治理策略

## 前端已实现的可视化（以当前代码为准）

- **System Overview**：全局指标（Total Memories / Active Contexts / Token Savings / Compression Ratio）与 L1/L2/L3 健康度面板。
- **Memory Pipeline**：实时摄取 → 压缩（Condensation）→ 实体抽取（Entity Graphing）→ 结构化入库（Vault）链路观测。
- **Semantic Radar**：以“雷达扫描/相关性 blips”展示检索候选与 rerank/过滤效果（强调可解释检索）。
- **RAG Debugger**：并排对照 Retrieved Raw Context vs Condensed Summary，并实时显示节省的 Token 比例。

> 注：仓库内也包含 `CortexVisualizer`（3D 点云）与 `MemoryHeatmap`（衰减热力图）组件，但目前尚未接入主视图；后端打通 embedding 与衰减数据后会重新接入。

## 系统架构（目标形态）

### Memory Controller（独立微服务）

把记忆的写入、检索、压缩、淘汰、审计从 Agent 中抽离出来，通过 API 暴露给业务 Agent。前端控制台用于观察系统吞吐、成本与治理效果。

### 分层存储（L1/L2/L3）

- **L1 Scratchpad（Redis）**：毫秒级读写，保存会话滑动窗口上下文（支持 TTL）。
- **L2 Semantic Store（Postgres + pgvector / Vector DB）**：保存历史交互与摘要，用于向量检索 + 元数据过滤。
- **L3 Entity Layer（MVP 先用 Postgres 关系表，后续可扩展 Neo4j）**：抽取关键实体与关系，用于纠偏语义漂移、提升高精度召回。

### 动态治理策略

- **重要性评分 + TTL/衰减**：自动清理低价值信息，防止 Memory 膨胀。
- **Condensation Worker（异步）**：周期性将碎片化短对话压缩成摘要写入长期记忆，并产出 token savings 指标。
- **去重/冲突检测**：向量相似度阈值 + 元数据规则，减少冗余并避免跨 namespace 污染。

## 开发路线（Agent 应用开发岗取向）

1. **定义 API 契约**：`/ingest`、`/query`、`/ops/stats`、`/ops/pipeline`、`/ops/audit`、`/policy`，让前端从 mock 切换到真实后端。
2. **落地最小可用后端**：FastAPI + Redis(L1) + Postgres/pgvector(L2)；完成端到端写入与查询。
3. **实现 Worker 治理链路**：condensation、去重/冲突检测、importance/decay，并在审计日志里可解释。
4. **检索与 rerank 可解释输出**：返回每条 chunk 的来源层级、分数组成与过滤原因，支撑 Radar/RAG Debugger。
5. **离线评测闭环**：Recall@k/MRR、Token Savings、Pollution Rate（跨 namespace 误召回率），写入 README 作为可验证成果。

## Run (Docker)

一条命令启动全栈（Postgres + Redis + API + Worker + Web UI）：

```bash
docker compose up --build
```

打开：

- UI: http://127.0.0.1:3000
- API: http://127.0.0.1:8000/docs

停止：

```bash
docker compose down
```

## Docs

- 实施记录（保姆级）：`docs/PROJECT_LOG.md`
- 小步任务清单：`docs/ROADMAP_TODO.md`

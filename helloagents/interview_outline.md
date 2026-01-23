# 面试讲解大纲（5–8 分钟）

## 0. 一句话定位（15s）

MemOS 把“记忆管理/上下文治理”从 Agent 业务逻辑里抽离出来，做成一个可观测的 Memory Controller（API + Worker + 控制台），解决长对话的上下文污染、成本与可解释性问题。

## 1. 系统组成（45s）

- **Web（Vite + React）**：Dashboard / Pipeline / Semantic Radar / RAG Debugger / Audit
- **API（FastAPI）**：`/v1/ingest`、`/v1/query`、`/v1/ops/*`、`/v1/sessions/reset`
- **Worker（RQ + Redis）**：异步 condensation，产出 token savings 与结构化 “memory card”
- **存储分层（当前可验证）**：
  - L1：Redis 滑动窗口（会话短记忆）
  - L2：Postgres + pgvector（durable memory + 向量列）
  - L3：规划（README 明确标注）

## 2. 核心数据流（2–3 分钟）

1) **Ingest**：Web 调 `/v1/ingest` → 写 Redis(L1 window) + 写 Postgres(memories) + 写审计(audit_logs)  
2) **Query**：Web 调 `/v1/query` → pgvector 检索候选 → 返回 `raw_chunks` + `condensed_summary`  
3) **异步 Condensation**：若无缓存 condensation，API enqueue `condensation` job → Worker 写入 `condensations`（结构化 JSON）  
4) **可观测**：
   - `/v1/ops/pipeline`：队列长度 + recent condensations（含结构化 `condensed_text`）
   - `/v1/ops/audit`：INGEST/QUERY/CONDENSATION 等事件（可解释）
   - `/v1/ops/condensations`：按 session 回放 condensation 历史（version/触发原因/输入来源）

## 3. 可解释性怎么做（1 分钟）

- Radar：用真实 `/v1/query` 候选可视化  
- rerank（MVP）：确定性启发式（vector similarity + token overlap）  
  - `raw_chunks[*].metadata.rerank_score`：每条候选的 rerank 分
  - `rerank_debug`：方法与权重（用于面试解释取舍）

## 4. 关键取舍（30–60s）

- 不引入真实 LLM embedding/rerank：先跑通可验证闭环（可复现、可测试、可演示）
- 指标以后端为准：Dashboard 通过 `/v1/ops/stats` 拉取，避免 UI 硬编码导致叙事偏离

## 5. 怎么验证（30–60s）

- 启动：`docker compose up -d --build`
- 验证闭环：`powershell -ExecutionPolicy Bypass -File "scripts/verify_demo.ps1"`
- 关键接口：打开 `http://127.0.0.1:8000/docs`

## 6. 下一步演进（30s）

- 用真实 embedding/rerank 替换 deterministic heuristic，并加入离线评测闭环（Recall@k/MRR、Token Savings、Pollution Rate）
- L3 Entity Layer：把 “memory card” 中的结构化字段升级为实体/关系层（可扩展 Neo4j）

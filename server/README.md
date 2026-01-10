# MemOS Backend (FastAPI) — 说明

这个目录将包含 MemOS 的后端实现（方案 B）：

- **FastAPI**：提供 Memory Controller 的 HTTP API（写入/检索/治理/观测）。
- **Redis**：L1 Scratchpad（会话滑动窗口）+ RQ 任务队列。
- **Postgres + pgvector**：L2 语义记忆（embedding 检索）+ 审计/策略等结构化数据。
- **RQ Worker**：异步任务（condensation 摘要压缩、实体抽取、去重/重算 embedding）。

## 为什么要拆 `server/`

前端控制台已经存在并可运行。把后端放在 `server/`，可以：

1. 避免破坏现有 Vite 项目结构。
2. 后端可独立部署（Memory-as-a-Service）。
3. 方便后续把 API 作为“平台能力”给多个 Agent/应用复用。

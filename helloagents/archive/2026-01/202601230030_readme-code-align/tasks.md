# 任务清单：README 与代码现状对齐（7 天冲刺）

> **@status:** completed | 2026-01-23 01:33

> 目标：把“README 承诺”变成“可验证的事实”，并把可讲述材料沉淀到 `helloagents/`。

## Day 1（阻断项清零：可信度）

- [√] README：移除对 `docs/PROJECT_LOG.md`、`docs/ROADMAP_TODO.md` 的引用，改为指向 `helloagents/`（知识库入口）。
- [√] README：把 API 契约写成真实路径（`/v1/ingest`、`/v1/query`、`/v1/ops/*`、`/v1/sessions/reset`）。
- [√] README：增加“当前实现 vs 目标形态”对照表（明确 Radar/Pipeline 哪些可验证、哪些是规划）。
- [√] 前端：移除 `vite.config.ts` 中对 `GEMINI_API_KEY` 的注入（避免把 key 打进前端 bundle）。

## Day 2（Radar 真实化：后端可解释输出）

- [√] 后端：为 `QueryResponse.rerank_debug` 提供 deterministic 调试输出（至少包含 `method` 与 `components`）。
- [√] 后端：审计日志补齐 query 的可解释字段（top_k、候选数量、是否命中缓存 condensation）。

## Day 3（Radar 真实化：前端接入）

- [√] 前端：`components/SemanticRadar.tsx` 移除 `MOCK_QUERY/MOCK_BLIPS`，改为从真实 `/v1/query` 构造 blips。
- [√] 前端：Radar 支持 “raw similarity vs rerank score” 切换（对应 `rerank_debug`）。

## Day 4（Ops 指标真实化）

- [√] 前端：Dashboard 指标改为从 `/v1/ops/stats` 拉取（替换 `App.tsx` 的硬编码 stats）。
- [√] 前端：Pipeline 明确阶段来源；Entity Graphing/Vault 若暂不可实现，先对齐后端可提供的数据（例如 condensation 结构化 JSON）。

## Day 5（最小测试集）

- [√] 后端：添加 API 冒烟测试（ingest/query/dev_seed/ops/audit/ops/pipeline/reset）。
  > 备注: 已添加单元冒烟（/health）与可选集成测试（需 `MEMOS_INTEGRATION_TESTS=1` + 可用的 Postgres/Redis/Docker 环境）。
- [√] 后端：添加 condensation 结构化输出校验（schema/字段存在性）。

## Day 6（脚本与运行路径整理）

- [√] scripts：整理 `scripts/` 使用说明（推荐命令、依赖、预期输出）。
- [?] scripts：确认 `scripts/verify_demo.ps1` 在至少一种模式下可稳定通过（全栈 docker 或“docker 依赖 + 本机服务”）。
  > 备注: 当前执行环境 Docker Engine 不可用（`dockerDesktopLinuxEngine` pipe 缺失），未能实际运行 verify；建议在你的本机 Docker Desktop 启动后执行 `scripts/verify_demo.ps1` 验证。

## Day 7（知识库沉淀 + 面试讲述稿）

- [√] `helloagents/modules/server.md`：补齐 API 与数据表对应关系、查询与 condensation 数据流。
- [√] `helloagents/modules/web.md`：补齐页面与 API 映射、namespace/session 隔离策略与原因。
- [√] `helloagents/modules/worker.md`：补齐队列、job 触发时机、Windows 兼容处理的原因与限制。
- [√] 产出 5–8 分钟“项目讲解大纲”（存入 `helloagents/`，执行时确定路径）。


# 提案：README 与代码现状对齐（面试 7 天冲刺）

## 背景

当前仓库的 README 对外叙事很强，但存在“README 承诺 > 实际代码可验证能力”的落差。你希望在 7 天内把“可讲清楚的工程闭环”补齐到 README 的核心承诺（而不是只靠文案）。

同时，仓库里 `docs/PROJECT_LOG.md`、`docs/ROADMAP_TODO.md` 不再需要；后续知识沉淀统一放入 `helloagents/` 知识库。

## 目标（7 天内达到）

1. README 与实现保持一致：按 README 操作不会踩“文档缺失/接口不一致/功能纯 mock”这类硬伤。
2. 面试可讲清楚：系统边界、数据流、关键取舍、可观测性、可扩展路径。
3. 可复现最小闭环验证：用 `scripts/` 下脚本证明 seed → ingest/query → audit/pipeline。

## 非目标（本轮明确不做）

- 不引入真实 LLM embedding / rerank（保留 deterministic fake embedding，作为可讲的工程取舍）。
- 不做完整 L3 Entity Graph（可做最小实体抽取占位，作为“下一步”）。
- 不追求 UI 视觉大改，优先修“真实性/可验证性/一致性”。

## 现状差距（以本次 ~review 为准）

| 项 | README 描述 | 代码现状 | 影响 |
|---|---|---|---|
| 文档入口 | 引用 `docs/*` | `docs/PROJECT_LOG.md`、`docs/ROADMAP_TODO.md` 缺失 | 可信度硬伤 |
| API 契约 | `/ingest` 等 | 实际为 `/v1/ingest` 等 | 按 README 调用会失败 |
| Semantic Radar | 真实检索 + rerank/过滤 | `SemanticRadar` 为 mock 数据 | 叙事与事实冲突 |
| Pipeline 实体抽取/入库 | 压缩→实体抽取→入库可观测 | Pipeline 主要展示 condensation 队列与 recent condensations | 可解释性不足 |
| 构建安全性 | 未声明 | `vite.config.ts` 注入 `GEMINI_API_KEY` 到前端 | 安全面试风险点 |

## 方案（推荐执行顺序）

## 决策

### readme-code-align#D001：Radar 先从 mock 切换为真实数据源

- 选择：Radar 使用真实 `/v1/query` 返回的 `raw_chunks` 作为候选来源；rerank 先用 deterministic heuristic（vector + token overlap）并暴露 `rerank_debug` 与 `metadata.rerank_score`。
- 原因：面试阶段优先“可验证闭环 + 可解释输出”，避免引入外部模型依赖导致不可复现。

### readme-code-align#D002：Dashboard 指标以后端 `/v1/ops/stats` 为准

- 选择：前端不再硬编码 Total Memories/Token Savings 等指标；统一从后端 ops 接口拉取并周期刷新。
- 原因：避免“UI 叙事 > 真实系统状态”，确保 README 与演示一致。

### A. 先修“阻断可信度”的一致性问题（Day 1）
- README：移除 `docs/*` 引用，改为指向 `helloagents/` 知识库（SSOT）。
- README：API 契约统一为实际路径（`/v1/*`），并把“目标形态”与“当前可验证能力”拆开写清楚。

### B. 把 Radar 从 mock 变成“真实可解释数据”（Day 2–3）
- 后端：为 `/v1/query` 补齐 `rerank_debug`（即使是 deterministic/fake，也要能解释“分数组成/过滤原因”）。
- 前端：`SemanticRadar` 改为调用真实 API（或复用 `/v1/query` 结果），用 `raw_chunks + rerank_debug` 生成 blips。

### C. 让 Dashboard/Pipeline 的指标来自后端（Day 4）
- Dashboard：从 `/v1/ops/stats` 取值，替换硬编码 mock 指标。
- Pipeline：明确“当前实现支持的阶段”，并把 “Entity Graphing/Vault” 的数据源对齐到后端可提供的字段（可先用 condensation 结构化 JSON）。

### D. 最小验证与面试讲解材料沉淀（Day 5–7）
- tests：补齐 API 冒烟测试与 condensation 结构校验。
- scripts：整理 `scripts/`，形成明确的验证路径。
- helloagents/：更新模块文档，把“为什么这样设计/取舍是什么/如何验证”沉淀成可复述材料。

## 验收标准（完成即“可面试讲清楚”）

- README 中所有路径与功能描述都能在代码与脚本中验证（至少 API 层面）。
- `SemanticRadar` 不再依赖 `MOCK_*` 数据；展示候选来自真实 `/v1/query` 响应。
- Dashboard 指标来自 `/v1/ops/stats`，空数据/少量数据下也能合理展示。
- `scripts/verify_demo.ps1`（或等价脚本）能证明：seed → ingest/query → audit/pipeline 闭环可运行。
- `helloagents/modules/*.md` 覆盖：API 列表、数据表、关键取舍（fake embedding、Windows worker）与演进路线。

# server

## 职责

提供 Memory Controller 后端（FastAPI）：
- ingest：写入 L1(L1 scratchpad/Redis) 与 L2(Postgres/pgvector) 并记录审计
- query：从 L2 做检索，返回候选 chunks、压缩摘要与可解释 debug 字段
- ops：提供 stats/pipeline/audit 等观测接口

## 接口定义（公共 API）

| 路径 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/v1/ingest` | POST | 写入记忆 |
| `/v1/query` | POST | 检索记忆并返回可解释结果 |
| `/v1/dev/seed` | POST | 灌入 demo 数据（开发/演示用途） |
| `/v1/ops/stats` | GET | 系统统计（示例：memories/contexts 等） |
| `/v1/ops/pipeline` | GET | 队列与 recent condensations |
| `/v1/ops/audit` | GET | 审计事件（可过滤） |
| `/v1/ops/condensations` | GET | Condensation 历史列表（支持 namespace/session_id 过滤） |
| `/v1/ops/context_packs` | GET | Context pack 历史列表（working memory，可过滤） |
| `/v1/ops/procedural` | GET | Procedural registry（prompt/tool registry） |
| `/v1/sessions/reset` | POST | 重置单个 namespace+session_id 的数据切片 |

## 行为规范

### MVP：deterministic fake embedding
**条件**: ingest 时需要 embedding  
**行为**: 使用 deterministic fake embedding 生成向量并写入 pgvector 列  
**结果**: 不依赖外部模型也能跑通 ingest→query→可视化链路

### Query 可解释输出（MVP：deterministic rerank）
**条件**: `/v1/query` 返回候选 chunks  
**行为**:
- 每条 `raw_chunks[*].metadata` 附带 `overlap`（query token overlap）与 `rerank_score`（确定性加权分）
- `rerank_debug` 返回方法与权重（当前：`deterministic_overlap_v1`）
**结果**: Radar 可以展示 “raw similarity vs rerank score” 的差异（无 LLM 依赖）

### Session Summary（Episodic condensation）
**条件**: `/v1/query` 检测到 session 有足够新消息  
**行为**: enqueue worker 生成 session summary 快照，写入 `condensations`（含 `version/trigger_details/source_memory_ids`）  
**结果**: `/v1/ops/condensations` 提供 per-session 回放历史；`/v1/ops/pipeline` 提供全局 recent 视图

### Working Memory（Context Pack）
**条件**: 每次 `/v1/query`  
**行为**: 组装 working memory（procedural + session summary + retrieval chunks）并写入 `context_packs`  
**结果**: `/v1/ops/context_packs` 可回放“某次 query 的上下文组装”，用于 debug/评测/面试讲解

### Session Reset（演示隔离）
**条件**: `confirm=true` 且（namespace, session_id）存在  
**行为**: 清理 Redis L1 key、删除 Postgres 中该 slice 的 memories/condensations，并追加审计事件  
**结果**: 不影响其他 session，便于演示与调试

## 依赖关系

```yaml
依赖:
  - infra（postgres/redis）
被依赖:
  - web
  - worker（共享队列与任务代码）
```

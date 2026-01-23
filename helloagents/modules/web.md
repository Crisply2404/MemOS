# web

## 职责

提供 MemOS 的可观测控制台（Vite + React），用于：
- 展示系统指标（Dashboard）
- 观察 ingest → condensation 的链路与队列状态（Pipeline）
- 展示检索候选与可解释信息（Semantic Radar / RAG Debugger）
- 查看审计日志（Audit）

## 接口定义（对外）

> Web 通过 HTTP 调用后端 API（默认 `http://localhost:8000`，可用 `VITE_API_BASE_URL` 覆盖）

### 关键请求
| API | 方法 | 用途 |
|-----|------|------|
| `/v1/ingest` | POST | 写入记忆（会写 L1 + L2，并写审计） |
| `/v1/query` | POST | 查询记忆（返回 raw chunks + condensed summary + debug） |
| `/v1/dev/seed` | POST | 一键灌入 demo 数据（用于 1 分钟演示） |
| `/v1/ops/stats` | GET | Dashboard 指标（Total Memories / Token Savings / Compression Ratio） |
| `/v1/ops/pipeline` | GET | 查看队列长度与 recent condensations |
| `/v1/ops/audit` | GET | 查看审计事件（支持 namespace/session_id 过滤） |
| `/v1/ops/context_packs` | GET | 查看 query 级 context pack（working memory）历史 |
| `/v1/ops/procedural` | GET | 查看 prompt/tool registry（procedural memory） |
| `/v1/sessions/reset` | POST | 重置单个 session slice（需 `confirm=true`） |

## 行为规范

### Namespace / Session 隔离
**条件**: 用户切换 namespace  
**行为**: 生成新的 `session_id`，避免跨租户/跨工作区污染  
**结果**: UI 历史消息与检索上下文被清空，后续调用都使用新 session

### Semantic Radar（真实数据源）
**条件**: 用户在 Radar 页面输入 query 并执行  
**行为**: 调用 `/v1/query` 并用 `raw_chunks[*].score` 与 `metadata.rerank_score` 渲染 blips  
**结果**: Radar 不依赖 mock 数据，展示“raw similarity vs rerank score”的可解释对比

### Session Summary History（Replay，可回放基础）
**条件**: 用户在 Pipeline/Vault 或 Ops 接口查看 session summary 的历史  
**行为**: 调用 `/v1/ops/condensations?namespace=...&session_id=...` 拉取该 session 的 session summary 列表  
**结果**: 可查看不同 `version` 的结构化卡片与触发元信息（用于 debug/评测/面试讲解）

### Working Memory（Context Pack）
**条件**: 用户在 RAG Debugger 查看  
**行为**: context pack 来源于 `/v1/query` 返回的 `context_pack`，也可通过 `/v1/ops/context_packs` 回放历史  
**结果**: 面试可解释“这次 query 的 prompt 是怎么拼出来的（procedural + episodic + semantic）”

### Debug Mode（业界默认：隐藏调试面板）
**条件**: 用户需要更强的可观测 debug 能力  
**行为**: 使用 Pipeline/Vault + Ops 接口查看 history/raw JSON 等调试信息  
**结果**: RAG Debugger 默认只展示 working memory（context pack），避免信息过载

## 依赖关系

```yaml
依赖:
  - server（HTTP API）
被依赖:
  - （无）
```

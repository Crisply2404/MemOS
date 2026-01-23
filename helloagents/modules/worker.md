# worker

## 职责

执行 MemOS 的异步治理任务（RQ Worker）：
- 监听 Redis 队列（默认 `condensation`）
- 执行后台作业（例如 condensation 压缩），用于生成 token savings 等可观测数据

## 接口定义（可选）

该模块无 HTTP API；通过 Redis 队列与 server 交互。

## 行为规范

### 跨平台 Worker
**条件**: 运行环境为 Windows  
**行为**: 使用 `SimpleWorker`（避免 `os.fork()`）  
**结果**: 本地开发/演示在 Windows 上可用

### Condensation 结构化输出（Memory Card）
**条件**: `/v1/query` 检测到 session 有足够新消息（或首次 bootstrap）会 enqueue job  
**行为**: worker 写入 `condensations` 表作为 session summary 快照（episodic），`condensed_text` 为结构化 JSON（`memos.memory_card.v2`）  
**结果**: Web 可回放 session summary history，并作为 working memory（context pack）的一部分用于解释“prompt 如何组装”

## 依赖关系

```yaml
依赖:
  - infra（redis）
  - server（memos_server 任务代码）
被依赖:
  - server（通过队列触发作业）
```

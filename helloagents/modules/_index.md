# 模块索引

> 通过此文件快速定位模块文档（以代码为准）

## 模块清单

| 模块 | 职责 | 状态 | 文档 |
|------|------|------|------|
| web | Web 控制台（Ops Console）与可视化 | 🚧 | [web.md](./web.md) |
| server | Memory Controller API（FastAPI） | 🚧 | [server.md](./server.md) |
| worker | 异步治理任务执行器（RQ Worker） | 🚧 | [worker.md](./worker.md) |
| infra | 本地/容器化运行与依赖（Docker/DB init） | 🚧 | [infra.md](./infra.md) |

## 模块依赖关系

```
web → server(API)
server → postgres(pgvector)
server → redis(L1 + queue)
worker → redis(queue) → server(共享任务代码)
```

## 状态说明
- ✅ 稳定
- 🚧 开发中
- 📝 规划中


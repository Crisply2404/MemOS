# infra

## 职责

提供本地与容器化运行 MemOS 的基础设施配置：
- Docker Compose：一条命令启动 Postgres(pgvector) / Redis / API / Worker / Web
- DB 初始化：Postgres init 脚本（创建表结构等）
- 环境变量约定：API/Worker/Web 的配置入口

## 接口定义（可选）

### 关键环境变量（示例）
| 变量 | 用途 |
|------|------|
| `MEMOS_DATABASE_URL` | API/Worker 连接 Postgres |
| `MEMOS_REDIS_URL` | API/Worker 连接 Redis |
| `MEMOS_LOAD_DOTENV` | 容器内是否加载 `.env` |
| `VITE_API_BASE_URL` | Web 端调用 API 的 base URL |

## 本地脚本（scripts/）

> 这些脚本用于快速启动/验证（面试讲解时可直接引用命令与预期输出）

| 脚本 | 用途 |
|------|------|
| `scripts/dev_web.ps1` | 启动前端（`npm run dev -- --host 0.0.0.0 --port 3000`） |
| `scripts/dev_api.ps1` | 启动 API（设置默认 `MEMOS_DATABASE_URL`/`MEMOS_REDIS_URL` 后运行 uvicorn） |
| `scripts/dev_worker.ps1` | 启动 Worker（本机监听 RQ 队列） |
| `scripts/verify_demo.ps1` | 验证闭环：seed → ingest/query → audit/pipeline（并检查 `/v1/ops/condensations` 的 session 历史） |
| `scripts/check_todo5.ps1` | 检查 condensation 的 structured 输出是否生效（快速对比 query 的 summary） |
| `scripts/reset_session.ps1` | 调用 `/v1/sessions/reset` 做演示隔离清理 |
| `scripts/rq_clear_condensation.ps1` | 清理 RQ condensation 队列（开发时用） |

## 依赖关系

```yaml
依赖: []
被依赖:
  - server
  - worker
  - web
```

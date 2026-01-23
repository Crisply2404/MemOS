# 项目上下文

## 1. 基本信息

```yaml
名称: MemOS
描述: 分布式 Agent 记忆与上下文治理引擎（Memory-as-a-Service）
类型: Web 控制台 + 后端 API + 异步 Worker
状态: 开发中（MVP 可跑通 ingest/query/condensation/ops）
```

## 2. 技术上下文

```yaml
语言:
  - TypeScript（Web UI）
  - Python（API / Worker）
框架:
  - Vite + React（前端）
  - FastAPI（后端 API）
  - RQ + Redis（异步队列/Worker）
数据与存储:
  - Postgres + pgvector（L2 语义记忆 / 审计）
  - Redis（L1 会话滑动窗口 / 队列）
包管理器:
  - npm（根目录 package-lock.json）
  - Python venv + pip（server/.venv）
构建与部署:
  - Docker Compose（全栈启动）
  - Vite Dev Server（前端热更新）
```

### 主要依赖（以代码为准）

| 依赖 | 版本 | 用途 |
|------|------|------|
| react / react-dom | 19.x | 前端 UI |
| vite | 6.x | 前端构建与开发服务 |
| fastapi | >=0.115 | API（Memory Controller） |
| sqlalchemy | >=2.0 | DB 访问 |
| psycopg[binary] | >=3.1 | Postgres 驱动 |
| redis | >=5.0 | Redis 连接 |
| rq | >=1.16 | 异步任务队列 |
| pgvector | >=0.3 | Postgres 向量类型支持 |

## 3. 项目概述

### 核心能力（当前仓库可验证）
- Web UI：Operational Dashboard / Pipeline / Radar / RAG Debugger / Audit
- API：`/v1/ingest`、`/v1/query`、`/v1/ops/*`、`/v1/dev/seed`、`/v1/sessions/reset`
- Worker：监听 `condensation` 队列执行压缩（condensation）

### 项目边界（当前实现）

```yaml
范围内:
  - 端到端跑通：写入记忆(ingest) → 检索(query) → 触发压缩(condensation) → ops/audit 可观测
  - 分层概念：L1=Redis 滑动窗口，L2=Postgres durable memory + 向量列，L3=规划中（README 目标）
范围外:
  - 真实 LLM embedding / rerank（当前后端使用 deterministic fake embedding 做 MVP 跑通）
  - 复杂治理策略（去重/冲突检测/衰减等为后续迭代点）
```

## 4. 开发约定

### 目录约定
```yaml
web(前端):
  - 根目录 TSX/TS（Vite 项目）
  - components/ UI 组件
  - utils/ 前端调用 API 与 mock 数据

server(后端):
  - server/memos_server/ FastAPI app 与依赖（DB/Redis/Queue）
  - server/worker.py RQ Worker 入口
  - server/db/init/ 数据库初始化脚本（供 docker compose）
```

### 测试要求（现状）
```yaml
测试框架:
  - Python: unittest（已建立最小测试集）
  - Web: 暂无（面试前以 build + demo 脚本验证为主）
测试文件位置:
  - server/tests/
```

### 运行方式（常用）
```yaml
Docker 全栈:
  - docker compose up --build
本地开发（依赖 docker，服务本地跑）:
  - docker compose up -d postgres redis
  - (server) uvicorn memos_server.app:create_app --factory --reload --port 8000
  - (server) python worker.py
  - (web) npm run dev -- --port 3000
```

## 5. 当前约束（源自实现）

| 约束 | 原因 | 决策来源 |
|------|------|---------|
| 后端 embedding 使用 deterministic fake embedding | 避免依赖外部模型，先跑通 ingest→query→可视化链路 | `server/memos_server/app.py` |
| Windows 上 RQ Worker 使用 SimpleWorker | 默认 Worker 依赖 `os.fork()`，Windows 不支持 | `server/worker.py` |

## 6. 已知技术债务（建议 7 天冲刺优先处理）

| 债务描述 | 优先级 | 来源 | 建议处理时机 |
|---------|--------|------|-------------|
| 缺少最小测试集（API 冒烟 + worker 任务 + UI API 调用） | P0 | 当前仓库现状 | 面试前 7 天 |
| `server/.venv` 进入仓库（体积/可移植性问题） | P1 | `server/` 目录结构 | 面试后或冲刺末尾 |
| Integration tests 需要 Docker Compose 环境（默认跳过） | P1 | `server/tests/test_integration_api.py` | 面试前说明运行方式 |

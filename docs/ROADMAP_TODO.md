# ROADMAP_TODO — 小步任务清单（持续更新）

这份文档的目标：把 Todo 拆成“小步可验证”的清单，你每做完一步都能明确知道“完成了什么、如何验证”。

> 状态标记：
> - [x] 已完成
> - [ ] 未完成

---

## 已完成

- [x] 前端现状梳理 + README 对齐
  - 验证：打开 `README.md`，内容与当前 UI 视图（Dashboard/Pipeline/Radar/RAG Debugger）一致。

- [x] 后端骨架（FastAPI + Pydantic models + settings）
  - 验证：在 `server/` 下能 import `memos_server.app:create_app`。

- [x] 本地基础设施（Postgres + Redis）
  - 验证：`docker compose ps` 显示两个服务 Up；Postgres 里能看到 `vector` 扩展与三张表。

- [x] 存储层 MVP（L1 Redis + L2 Postgres + Option A embedding）
  - 验证：调用 `/v1/ingest` 后 `memories` 表有数据；调用 `/v1/query` 能返回 `raw_chunks`。

---

## 进行中（下一步）

- [x] 启动 FastAPI 服务并用 Swagger 验证接口
  - 命令（示例）：`cd server && source .venv/bin/activate && uvicorn memos_server.app:create_app --factory --reload --port 8000`
  - 验证：浏览器打开 `http://localhost:8000/docs`，能看到 `/v1/ingest`、`/v1/query`。

- [x] Smoke Test（最小验证）
  - 目标：确认服务能启动，且 `/health`、`/v1/ingest`、`/v1/query` 跑通。
  - 验证步骤：
    - 1) 启动服务：`cd server && source .venv/bin/activate && uvicorn memos_server.app:create_app --factory --port 8000`
    - 2) 打开文档：`http://localhost:8000/docs`
    - 3) 在 Swagger 里依次调用：
      - `POST /v1/ingest` 写入 2 条消息（user/agent）
      - `POST /v1/query` 查询并观察返回的 `raw_chunks` 和 `condensed_summary`

- [ ] 实现 RQ Worker（真正的 condensation）
  - 目标：把“摘要生成”放到后台，写入 `condensations` 表，并累积 token savings。
  - 验证：执行一段 ingest 后，触发 worker 任务；`condensations` 表出现新记录。

- [ ] 增加 `/v1/ops/pipeline` 与 `/v1/ops/audit`
  - 目标：让前端 Pipeline/Audit 页面能拉到真实数据。
  - 验证：请求能返回队列长度、最近任务、最近审计事件。

---

## 待做（前端联调）

- [ ] 前端从 mockData 切换到真实 API
  - 目标：RAG Debugger 先跑通（最直观）。
  - 验证：输入消息后，右侧 Raw vs Condensed 来自后端接口，不再使用 `utils/mockData.ts`。

- [ ] 端到端演示脚本
  - 目标：给面试官 1 分钟演示：存记忆 → 查记忆 → 省 token → 看审计。

---

## 版本控制（Commit 节奏提醒）

建议把 commit 颗粒度控制在“一个可运行里程碑”。建议节奏如下：

- 里程碑 1：`backend-mvp-storage`（已达成）
  - 内容：compose + 表结构 + L1 Redis + ingest/query 真存真查
  - 建议现在就 commit（见本文档下方建议）。

- 里程碑 2：`worker-condensation`（完成 RQ worker 后）
- 里程碑 3：`ops-endpoints`（pipeline/audit/stats 完整）
- 里程碑 4：`frontend-api-integration`（前端切真 API）

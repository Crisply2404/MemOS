# Copilot Instructions — MemOS 工作流（必须遵守）

本文件定义本仓库的协作工作流：**日志同步、Todo 跟踪、Commit 节奏**。后续每次修改代码或推进里程碑时，必须自动执行并更新相关文件。

---

## 1) 日志同步（必须）

每完成一个“可验证的阶段性成果”（里程碑），必须同步更新：

- `PROJECT_LOG.md`
  - 位置：`docs/PROJECT_LOG.md`
  - 追加一节：**做了什么 / 为什么这么做 / 原理是什么 / 当前状态 / 如何验证**。
  - 语言：小白可读，避免堆术语。

- `ROADMAP_TODO.md`
  - 位置：`docs/ROADMAP_TODO.md`
  - 将对应步骤从 `[ ]` 更新为 `[x]`。
  - 补充“如何验证”的命令或操作路径（例如打开 `http://localhost:8000/docs`）。

> 任何代码改动如果影响接口或运行方式，同步更新以上两份文档。

---

## 2) Todo 跟踪（必须）

使用会话内 Todo 列表作为执行顺序；要求：

- 一次只允许一个任务处于 in-progress。
- 完成一个任务后，立刻标记完成，并将下一个任务标记为 in-progress。
- 如果中途发现任务需要拆分/合并，先更新 Todo 列表，再继续。

同时：

- `docs/ROADMAP_TODO.md` 必须保持“与当前进度一致”。
- 任何新增的关键步骤都要落入 `ROADMAP_TODO.md`（可验证的小步）。

---

## 3) Commit 节奏与提醒（必须）

原则：以“一个可运行/可演示/可回滚的里程碑”为粒度 commit。

### 3.1 什么时候应该 commit

出现以下情况，必须提醒用户进行 commit（或用户要求时帮忙准备命令）：

- 新增后端/前端的一个完整能力闭环（例如：`ingest/query` 真存真查；`worker` 真生成摘要）。
- 新增或更改 API 契约，且前端/后端已联调通过。
- 引入基础设施变化（例如 docker-compose、数据库 schema）并验证可启动。

### 3.2 推荐的 commit message 模板

- `feat: ...` 新功能（大多数里程碑用这个）
- `fix: ...` 修 bug
- `docs: ...` 仅文档
- `chore: ...` 依赖/工具/杂项

message 需包含关键信息，例如：

- `feat: backend MVP with Redis L1 + pgvector L2 (ingest/query)`
- `feat: add RQ condensation worker`
- `feat: wire frontend to backend API`

### 3.3 预报提醒

在推进到下一里程碑前，提前告诉用户“下一次建议 commit 的节点”和建议 message。

---

## 4) 解释风格（必须）

用户偏小白解释：

- 每一步必须解释：**在干什么、为什么、原理是什么**。
- 先给“类比/直觉”，再给“工程解释”。
- 避免一次抛出大量英文术语；必要时给 1 句话定义。

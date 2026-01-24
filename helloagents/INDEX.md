# MemOS 知识库

> 本目录是 MemOS 项目的知识库（SSOT：以代码为准，同步文档）

## 快速导航

| 需要了解 | 读取文件 |
|---------|---------|
| 项目概况、技术栈、开发约定 | [context.md](context.md) |
| 模块索引 | [modules/_index.md](modules/_index.md) |
| 某个模块的职责和接口 | [modules/<module>.md](modules/) |
| 项目变更历史 | [CHANGELOG.md](CHANGELOG.md) |
| 历史方案索引 | [archive/_index.md](archive/_index.md) |
| 当前待执行的方案 | [plan/](plan/) |
| 业界对标与架构图（推荐先读） | [modules/industry_alignment.md](modules/industry_alignment.md) |

## 知识库状态

```yaml
最后更新: 2026-01-24 00:40
模块数量: 5
待执行方案: 0
```

## 读取指引

```yaml
启动任务:
  1. 读取本文件获取导航
  2. 读取 context.md 获取项目上下文
  3. 需要理解实现细节时，从 modules/_index.md 进入具体模块

面试讲解建议:
  1. 先讲“系统目标 + 分层记忆(L1/L2/L3) + 治理链路(异步压缩/审计)”
  2. 再讲“Web 控制台如何可视化 + API/Worker 如何支撑可解释输出”
  3. 最后讲“当前 MVP 的取舍（如 fake embedding）与下一步计划”
```

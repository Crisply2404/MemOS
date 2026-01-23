# 变更日志

## [Unreleased]

### 修复
- **[server/db]**: 修复 `condensations.version` 类型不一致导致 worker 写入失败（init schema 改为 `TEXT DEFAULT 'v1'`）
- **[web]**: 结构化 memory card 兼容“被二次 JSON 编码”的字符串；历史面板默认按卡片渲染并补充用途说明
- **[repo]**: `ROADMAP_TODO.md` 移除已弃用的 A2 标识，避免面试叙事残留

## [0.0.1] - 2026-01-23

### 新增
- **[server]**: `/v1/query` 提供 deterministic rerank 解释输出，并在 `/v1/ops/pipeline` 返回结构化 condensation 文本
  - 方案: [202601230030_readme-code-align](archive/2026-01/202601230030_readme-code-align/)
  - 决策: readme-code-align#D001(Radar 真实化), readme-code-align#D002(Ops stats 为准)
- **[web]**: Radar 改为真实 `/v1/query` 数据源；Dashboard 指标以 `/v1/ops/stats` 为准
  - 方案: [202601230030_readme-code-align](archive/2026-01/202601230030_readme-code-align/)
  - 决策: readme-code-align#D001(Radar 真实化), readme-code-align#D002(Ops stats 为准)

### 修复
- **[readme]**: 去除失效 docs 引用，统一 API 路径与“当前 vs 目标形态”说明
  - 方案: [202601230030_readme-code-align](archive/2026-01/202601230030_readme-code-align/)
- **[web]**: 移除 `vite.config.ts` 对 `GEMINI_API_KEY` 的注入，避免把 key 打进前端 bundle
  - 方案: [202601230030_readme-code-align](archive/2026-01/202601230030_readme-code-align/)

## [0.0.2] - 2026-01-23

### 新增
- **[server]**: 新增 `/v1/ops/condensations` 用于按 session 回放 condensation 历史（含 version/trigger/source ids）
  - 方案: [202601230030_readme-code-align](archive/2026-01/202601230030_readme-code-align/)
- **[web]**: RAG Debugger 增加 Condensation History 面板，支持查看历史与结构化卡片内容
  - 方案: [202601230030_readme-code-align](archive/2026-01/202601230030_readme-code-align/)

## [0.0.0] - 2026-01-23

### 新增
- **[helloagents]**: 初始化项目知识库目录结构与模块文档（用于后续同步与面试讲解）

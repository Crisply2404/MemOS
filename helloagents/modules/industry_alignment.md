# 业界 Agent Memory 架构对标（对齐 README）

目标：把“业界做法”的逻辑抽象沉淀为 MemOS 的可讲述架构，并明确与当前实现/README 的对齐点、冲突点与取舍。

---

## 1. 业界参照图（完整元素，不只 4 类记忆）

你给的业界图除了“四类记忆”，还包含了与这些记忆联动的一整套组件与数据流（编号 1–5）。按图中元素拆开来看：

### 1.1 Core（LLM + Orchestrator）
- **LLM**：最终执行推理/生成的模型
- **Orchestrator**：负责把“工具/记忆/上下文”拼成一次运行的 prompt，并驱动工具调用的控制层

> 对标到 MemOS：MemOS 当前定位是 **Memory Controller 服务**，不实现 Core（LLM/Orchestrator）本体；Core 属于上游 Agent 应用/框架。

### 1.2 Embedding Model
- 把文本转成向量（embedding），供后续向量检索

> 对标到 MemOS：当前是 deterministic embedding（MVP 可复现），后续可替换为真实 embedding 模型。

### 1.3 Vector Database + Vector Index + Indexing + ANN Search
- **Vector Database**：存放向量 + 元数据
- **Vector Index**：向量索引结构
- **Indexing**：写入时建立/更新索引
- **ANN（Approximate Nearest Neighbour）**：近似最近邻搜索，用于 Top‑K 召回

> 对标到 MemOS：L2 用 Postgres + pgvector；ANN/Indexing 由数据库/索引承担（MVP 用 pgvector 的能力跑通闭环）。

### 1.4 Semantic Memory 的“内容来源”不止对话
- **Private Knowledge Base**：Notion/Docs/PDF/代码仓库等私有资料（通常需要 ingestion + chunking）
- **Grounding Context**：更稳定的“背景事实/全局约束”（例如用户画像、组织政策、项目概况等）

> 对标到 MemOS：目前主要是“对话事件 + 可检索的 memory 记录”；文档 ingestion/grounding 是 Day 2 的重点补齐项。

### 1.5 Short‑term (Working) Memory 的结构（一次运行的上下文拼装）
图里强调 Working Memory 不是一种存储，而是一次运行的“上下文拼装结果”，典型字段包括：
- Prompt structure（结构/模板）
- Available tools（工具列表）
- Additional context（额外上下文）
- Reasoning and action history（推理/行动历史）

> 对标到 MemOS：我们用 **Context Pack** 来表达 working memory（query‑scoped），并支持回放。

### 1.6 Procedural Memory 的载体
- Prompt Registry（提示模板库）
- Tool Registry（工具注册表）

> 对标到 MemOS：`/v1/ops/procedural` 暂以 registry 形式表达，后续可以扩展为真正的版本化配置（可回滚/可评测）。

---

## 2. 业界图的核心逻辑（抽象成 4 类记忆）

业界常见的 Agent Memory 会拆成四层（名称可能不同，但职责相对稳定）：

1) **Episodic Memory（情景/会话记忆）**
- 含义：按会话/用户交互事件组织的“发生过什么”（messages、tool calls、actions）
- 典型产物：**Session Summary**（会话摘要快照，可多次刷新并保留历史）

2) **Semantic Memory（语义/长期记忆）**
- 含义：可长期保存、可检索的知识（对话事实、文档片段、知识库条目）
- 典型能力：Embedding → Vector Index → ANN Top‑K retrieval

3) **Procedural Memory（程序/流程记忆）**
- 含义：如何做事的“套路”（prompt 模板、工具 registry、策略参数）
- 典型产物：Prompt Registry + Tool Registry

4) **Short‑term / Working Memory（工作记忆）**
- 含义：一次推理（一次 query）真正放进 prompt 的上下文拼装结果
- 典型结构：instructions + tools + session summary + retrieved chunks + extra context

---

## 3. MemOS 当前实现如何对标（以代码为准）

| 业界概念 | MemOS 中的对应物 | 入口/实现 |
|---|---|---|
| Episodic events（会话事件） | `memories`（按 `namespace+session_id`）+ Redis L1 window | `server/memos_server/app.py` `/v1/ingest` + `server/memos_server/l1_redis.py` |
| Session Summary（Episodic summary） | `condensations` 表（session summary 快照历史）+ worker 异步刷新 | `server/memos_server/condensation.py` + `server/worker.py` |
| Semantic memory + vector index | Postgres + pgvector（L2）+ deterministic embedding（MVP） | `server/memos_server/embedding.py` + `/v1/query` |
| Working Memory（context pack） | `context_packs` 表 + `/v1/query` 返回 `context_pack` | `server/memos_server/app.py` + `server/db/init/010-schema.sql` |
| Procedural memory | `/v1/ops/procedural`（prompt/tool registry） | `server/memos_server/procedural.py` |

---

## 4. 架构图（业界参照 + MemOS 边界）

### 4.1 业界参照图（Mermaid 复刻：元素齐全）

> 说明：这是对你给的业界图的“结构复刻”，用于知识库对齐概念。并不代表 MemOS 已经实现了右侧 Core 或左侧私有知识库 ingestion。

```mermaid
flowchart LR
  %% Core
  CORE[Core\nLLM + Orchestrator] --> WM[Short-term (Working)\nMemory]

  %% Episodic
  EP[Episodic Memory\nPrevious interactions] --> WM

  %% Procedural
  PR[Prompt Registry] --> WM
  TR[Tool Registry] --> WM

  %% Semantic sources
  PKB[Private Knowledge Base\n(Notion/Docs/PDF/Code)] --> SEM[Semantic Memory]
  GC[Grounding Context] --> SEM

  %% Embedding & Vector DB
  SEM --> EMB[Embedding Model]
  EMB --> VDB[Vector Database]
  VDB --> IDX[Vector Index]
  IDX --> ANN[ANN Search (Top-K)]
  ANN --> WM
```

### 4.2 MemOS 目标架构（对齐业界，但明确边界）

```mermaid
flowchart LR
  %% External core (out of MemOS scope)
  CORE[Agent Core\nLLM + Orchestrator] -->|query| API[MemOS API\nFastAPI]

  %% Working memory (query-scoped)
  API -->|assemble| CP[Working Memory\nContext Pack (v1)]
  CP -->|persist| CPDB[(Postgres\ncontext_packs)]
  API -->|return| CORE

  %% Episodic memory
  CORE -->|ingest events| API
  API -->|L1 window| L1[(Redis\nL1 window)]
  API -->|durable events| M[(Postgres\nmemories)]

  %% Semantic retrieval
  API -->|embedding| EMB[Embedding\n(MVP: deterministic)]
  EMB -->|vector| M
  API -->|ANN top-k| M
  M -->|chunks| CP

  %% Episodic summary (async)
  API -->|enqueue refresh| Q[(Redis RQ\ncondensation queue)]
  Q --> W[Worker\nRQ/SimpleWorker]
  W -->|session summary snapshot| C[(Postgres\ncondensations)]
  C -->|latest summary| API
  C -->|summary history| OPS[Ops API]
  CPDB -->|context pack history| OPS
  OPS --> WEB[Web Ops Console]
```

读图要点：
- **context pack** 是一次 query 的“工作记忆拼装结果”（query‑scoped）。
- **condensations** 是 session summary 的“快照历史”（session‑scoped）。
- “history”主要属于 Ops/Debug/评测能力，而不是普通用户主流程。

---

## 5. README vs 业界做法：对齐点、冲突点与取舍

### 5.1 对齐点（当前已做到）
- 分层概念清晰：L1（短期）/L2（长期可检索）+ worker 异步治理链路
- 有可解释产物：session summary（结构化卡片）+ working memory（context pack）
- 有可观测接口：`/v1/ops/*`（audit/pipeline/condensations/context_packs/procedural）

### 5.2 冲突点（需要承认并解释）
1) **Embedding/ANN 的真实性**
- 业界：真实 embedding 模型 + ANN index
- 当前：deterministic fake embedding（可复现、可跑通，但检索质量有限）

2) **Semantic Memory 的来源**
- 业界：对话 + 私有知识库（Notion/Docs/PDF 等）
- 当前：主要是对话事件（memories），尚未引入文档 ingestion/chunking 管道

3) **Summary 抽取质量**
- 业界：LLM 抽取 facts/preferences/constraints/decisions 等结构
- 当前：规则抽取为主（risks/actions 相对更稳定），核心 buckets 仍是“字段已预留但内容未丰富”

4) **Orchestrator/Agent Core 不在仓库内**
- 业界图右侧常有 Orchestrator + LLM
- 当前：MemOS 作为 Memory Controller（服务），核心 Agent/Orchestrator 属于上游集成方

5) **Private Knowledge Base / Grounding Context 未实装**
- 业界：常见把“文档/私有资料/背景事实”纳入 semantic memory
- 当前：尚未引入 ingestion/chunking；grounding 也还没有独立建模

### 5.3 当前取舍（建议口径）
- 先把“链路 + 产物 + 可观测”做实（可跑、可测、可解释），再逐步替换为真实模型/策略。

---

## 6. 七天冲刺计划（优化版：以“对齐业界全图”为目标）

> 原则：每一天都能回答三件事：交付物、验证方式、对标业界图里的哪个组件。

### Day 1：完善 Memory Card 的核心 buckets（最小可用）
- 目标：让 `facts/preferences/constraints/decisions` 不再永远为空（先规则版）
- 验证：RAG Debugger 的 working memory 里能看到 buckets 有内容；并写入 session summary 快照

### Day 2：补齐 Private Knowledge Base ingestion（Semantic Memory 的关键缺口）
- 目标：加入最小文档 ingestion（本地 md/txt → chunk → 入库 + embedding）
- 验证：同一 query 能召回“文档 chunk”而不仅是对话事件（并可在 context pack 里看到来源）

### Day 3：升级触发策略与解释字段
- 目标：summary refresh 触发原因更合理（token 阈值/idle/每 N 条消息等）并写入 `trigger_details`
- 验证：`/v1/ops/condensations` 里能看到触发原因与输入集合的变化

### Day 4：补齐 Vector Index / ANN 的叙事与实现细节
- 目标：明确索引/ANN 的工作方式（pgvector/或外部向量库），并把“索引/召回”元信息写进 context pack
- 验证：ops 或调试视图能看到 index/检索方式（例如：pgvector + cosine + top-k）

### Day 5：评测闭环（最小可量化）
- 目标：落地 2–3 个可量化指标（token savings / cache hit / recall@k 或 pollution rate）
- 验证：Ops/脚本能跑出指标并复现

### Day 6：稳定性收口
- 目标：把“跑不通/跑不稳”的风险清零（文档、脚本、默认配置）
- 验证：新环境按 README 能跑通；`scripts/verify_demo.ps1` 一键验证

### Day 7：面试口径固化（最后一天再写讲稿）
- 目标：把“对标业界 + 当前取舍 + 下一步路线”写成 10 分钟讲述提纲（SSOT 在 KB）

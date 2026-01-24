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

## 6. 冲刺计划（不绑定天数：任务池 + 验证方式）

> 原则：每个任务都要可验证（脚本/测试/接口），并能映射到业界参照图里的组件。

### P0（先做：讲清楚 + 体验立刻提升）

- **T1: Memory Card buckets 最小实装（rules-based）**
  - 目标：`facts/preferences/constraints/decisions` 不再永远为空；能从会话文本里抽取出“可讲述”的结构化条目
  - 对标：Episodic summary（Session Summary）
  - 验证：`server/tests/test_condensation_card.py` 覆盖；UI 的 working memory card 能看到 buckets 有内容

- **T2: Private Knowledge Base ingestion（本地文档 → semantic memory）**
  - 目标：本地 `md/txt` → chunk → 入库 + embedding；query 能召回 doc chunks
  - 对标：Private Knowledge Base + Semantic Memory + Indexing
  - 验证：新增 demo 文档后，`/v1/query` 的 raw_chunks 里能看到 `source=doc`

- **T3: Summary refresh 策略与解释字段（trigger_details）**
  - 目标：把“为什么刷新 summary”讲清楚（token 阈值/idle/每 N 条消息）并写进 `trigger_details`
  - 对标：Episodic summary 刷新策略
  - 验证：`/v1/ops/condensations` 能看到触发原因与输入集合变化

### P1（更像业界：质量与叙事）

- **T4: Vector Index / ANN 叙事与实现细节**
  - 目标：明确检索方式（pgvector/或外部向量库）并把索引/召回元信息写进 context pack
  - 对标：Vector Database / Vector Index / ANN
  - 验证：context pack 中记录检索 method 与 top_k、距离度量等

- **T5: 动态治理策略（README 三项）**
  - 目标：重要性/衰减、去重/冲突检测、session summary worker（已具备）三项都可验证
  - 对标：Governance（图里隐含在 memory pipeline）
  - 验证：audit/ops 中能看到治理产物或指标

### P2（扩展：更完整的“引擎感”）

- **T6: L3 Entity Layer（Neo4j）最小接入**
  - 目标：从 memory card/doc chunks 提取实体与关系，落到图里并可查询
  - 对标：Knowledge Graph / Entity layer（README 规划项）
  - 验证：新增 `/v1/ops/graph/*` 或最小查询接口，前端能展示

- **T7: CortexVisualizer 实装（真实数据驱动）**
  - 目标：用真实 embedding/投影驱动 3D 点云，可按 source/namespace/session 过滤
  - 对标：可观测控制台（非业界图核心，但提升“系统感”）
  - 验证：UI 中可稳定展示点云并与检索结果联动

- **T8: 评测闭环（可量化）**
  - 目标：落地 2–3 个指标（token savings / cache hit / recall@k / pollution rate）
  - 对标：评测与回归（面试叙事）
  - 验证：脚本一键跑出指标并可复现

from __future__ import annotations


def get_demo_seed_messages_zh() -> list[tuple[str, str]]:
    """Return a deterministic demo dataset (Chinese).

    This is intentionally human-readable and project-specific so demos can explain:
    - what MemOS is,
    - what decisions/constraints/preferences we made,
    - what pitfalls we hit during development.
    """

    return [
        (
            "user",
            "我们在做 MemOS：Agent 记忆与上下文治理服务。后端 FastAPI + Redis(L1) + Postgres(pgvector)(L2) + RQ worker（condensation）。",
        ),
        (
            "user",
            "我的偏好：所有命令用 Windows PowerShell 7（pwsh）；回答要简洁，先结论后解释；所有步骤必须可验证（给具体命令/URL）。",
        ),
        (
            "user",
            "决策：API 保留 /v1 前缀；LLM/Orchestrator 不在 MemOS 内部实现（由上游 Agent Core 负责）。",
        ),
        ("user", "决策：前端面板从“RAG Debugger”改名为“Context Inspector”，避免误导（不是只做 RAG）。"),
        ("user", "我的偏好：Context Inspector 默认只展示 Working Memory（Session Summary 卡片）；L1/L2/Procedural 等 debug 信息折叠。"),
        ("user", "约束：不要提交 ROADMAP_TODO.md；commit 最多拆 3 个；不要自动 commit。"),
        (
            "user",
            "运行方式：docker compose 启动 postgres/redis；后端 uvicorn memos_server.app:create_app --factory --reload --port 8000；前端 npm run dev -- --port 3000。",
        ),
        ("user", "踩坑：本机 postgres 占用 5432 会导致连错数据库并出现 password authentication failed（看起来像前端/跨域问题）。"),
        ("user", "踩坑：worker 写 condensation 时遇到 invalid input syntax for type integer: \"memos.memory_card.v2\"；原因是 DB schema 的 version 字段类型不匹配。"),
        ("user", "事实：L2 先用 deterministic fake embedding 跑通闭环；后续再接真实 embedding + cross-encoder rerank。"),
        ("user", "事实：condensations 表的 version 是 memos.session_summary.v1；condensed_text 是结构化 JSON（memos.memory_card.v2）。"),
        ("user", "决策：Session Summary History 不放在 Context Inspector 主视图里，改放到 Memory Pipeline / Structured Vault 里看回放。"),
        ("user", "约束：保留 /v1；不要把 memos.context_pack.v1 / memos.memory_card.v2 这种 schema/version 暴露给终端用户。"),
        ("user", "踩坑：token savings 一度出现负数，因为 JSON 结构比 raw text 更长；改为用 plain working-memory 文本计 token。"),
        ("agent", "下一步计划：1）Pipeline 切真数据（/v1/ops/pipeline）；2）1 分钟端到端演示脚本；3）轻量 Audit 面板；4）评测/回归脚本。"),
        ("agent", "规划：L3 Entity Graph（Neo4j 可选）+ Semantic Radar 完善 + 三个动态治理策略（importance/decay/去重冲突）逐步补齐。"),
    ]


from __future__ import annotations

from typing import Any


_PROMPT_REGISTRY: dict[str, Any] = {
    "default_query_prompt_v1": {
        "name": "default_query_prompt_v1",
        "description": "Assembles working memory from (session summary + retrieved chunks) for the agent.",
        "sections": ["system", "tools", "session_summary", "retrieved_chunks", "user_query"],
    }
}

_TOOL_REGISTRY: dict[str, Any] = {
    "tools": [
        {
            "name": "ingest",
            "endpoint": "/v1/ingest",
            "type": "http_api",
            "purpose": "Write episodic events into memory stores (L1 + L2) and audit.",
        },
        {
            "name": "query",
            "endpoint": "/v1/query",
            "type": "http_api",
            "purpose": "Retrieve semantic candidates and return the working memory context pack.",
        },
    ]
}


def get_procedural_registry() -> tuple[dict[str, Any], dict[str, Any]]:
    return (_PROMPT_REGISTRY, _TOOL_REGISTRY)


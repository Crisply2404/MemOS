from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class MemoryTier(str, Enum):
    """Storage tier label.

    Note: this matches the frontend enum labels in `types.ts` to reduce impedance.
    """

    L1_SCRATCHPAD = "L1 Scratchpad (Redis)"
    L2_SEMANTIC = "L2 Semantic (Vector DB)"
    L3_ENTITY = "L3 Entity Graph (Neo4j)"


class ChatRole(str, Enum):
    user = "user"
    agent = "agent"
    system = "system"
    tool = "tool"


class IngestRequest(BaseModel):
    namespace: str = Field(..., min_length=1, max_length=128)
    session_id: str = Field(..., min_length=1, max_length=128)
    role: ChatRole
    text: str = Field(..., min_length=1, max_length=20_000)
    metadata: dict[str, Any] = Field(default_factory=dict)


class IngestResponse(BaseModel):
    memory_id: str
    accepted: bool = True


class QueryRequest(BaseModel):
    namespace: str = Field(..., min_length=1, max_length=128)
    session_id: str = Field(..., min_length=1, max_length=128)
    query: str = Field(..., min_length=1, max_length=2_000)
    top_k: int = Field(default=6, ge=1, le=50)


class RetrievedChunk(BaseModel):
    id: str
    tier: MemoryTier
    text: str
    score: float
    metadata: dict[str, Any] = Field(default_factory=dict)


class RerankDebug(BaseModel):
    method: str
    components: dict[str, float]


class QueryResponse(BaseModel):
    id: str
    source_tier: MemoryTier
    similarity: float
    raw_chunks: list[RetrievedChunk]
    condensed_summary: str
    token_usage_original: int
    token_usage_condensed: int
    rerank_debug: list[RerankDebug] = Field(default_factory=list)
    # Industry-aligned debug surfaces:
    # - session summary: episodic condensation snapshots (per session)
    # - context pack: working memory assembled for this query
    session_summary_id: str | None = None
    session_summary_cache_hit: bool = False
    session_summary_enqueued: bool = False
    context_pack_id: str | None = None
    context_pack: dict[str, Any] = Field(default_factory=dict)


class OpsStatsResponse(BaseModel):
    total_memories: int
    active_contexts: int
    token_savings: int
    compression_ratio: float


class OpsQueueInfo(BaseModel):
    name: str
    count: int


class OpsRecentCondensation(BaseModel):
    id: str
    namespace: str
    session_id: str
    version: str
    condensed_text: str
    token_original: int
    token_condensed: int
    created_at: str


class OpsPipelineResponse(BaseModel):
    queues: list[OpsQueueInfo]
    recent_condensations: list[OpsRecentCondensation]


class OpsAuditEvent(BaseModel):
    id: str
    namespace: str
    session_id: str
    event_type: str
    details: dict[str, Any]
    created_at: str


class OpsAuditResponse(BaseModel):
    events: list[OpsAuditEvent]


class OpsCondensation(BaseModel):
    id: str
    namespace: str
    session_id: str
    version: str
    trigger_reason: str | None = None
    trigger_details: dict[str, Any] = Field(default_factory=dict)
    source_memory_ids: list[str] = Field(default_factory=list)
    condensed_text: str
    token_original: int
    token_condensed: int
    created_at: str


class OpsCondensationsResponse(BaseModel):
    condensations: list[OpsCondensation]


class OpsContextPack(BaseModel):
    id: str
    namespace: str
    session_id: str
    query_text: str
    session_summary_id: str | None = None
    retrieved_count: int = 0
    created_at: str
    pack: dict[str, Any] = Field(default_factory=dict)


class OpsContextPacksResponse(BaseModel):
    context_packs: list[OpsContextPack]


class OpsProceduralResponse(BaseModel):
    prompt_registry: dict[str, Any] = Field(default_factory=dict)
    tool_registry: dict[str, Any] = Field(default_factory=dict)


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


class ResetSessionRequest(BaseModel):
    namespace: str = Field(..., min_length=1, max_length=128)
    session_id: str = Field(..., min_length=1, max_length=128)
    confirm: bool = False
    dry_run: bool = False
    clear_audit: bool = False


class ResetSessionCounts(BaseModel):
    redis_keys: int = 0
    memories: int = 0
    condensations: int = 0
    audit: int = 0


class ResetSessionResponse(BaseModel):
    ok: bool = True
    namespace: str
    session_id: str
    reset_at: str
    deleted_counts: ResetSessionCounts

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

from __future__ import annotations

import json
import time
import uuid

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from memos_server.api_models import (
    HealthResponse,
    IngestRequest,
    IngestResponse,
    MemoryTier,
    OpsAuditResponse,
    OpsPipelineResponse,
    OpsStatsResponse,
    QueryRequest,
    QueryResponse,
    RetrievedChunk,
)
from memos_server.db import create_db
from memos_server.condensation import latest_condensation
from memos_server.queue import Queues, create_queues
from memos_server.embedding import fake_embedding
from memos_server.l1_redis import L1Redis, append_message, create_l1, get_window
from memos_server.settings import Settings, get_settings


def create_app() -> FastAPI:
    """FastAPI factory.

    Why a factory: makes it easier to test and to configure environments.
    """

    app = FastAPI(title="MemOS Memory Controller", version="0.1.0")

    # Allow the Vite dev server to call the API from the browser (CORS).
    # Why: without this, browsers will block requests from http://localhost:3000 to http://localhost:8000.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    settings = get_settings()
    db = create_db(settings.database_url)
    l1 = create_l1(settings.redis_url, settings.l1_window_size)
    queues = create_queues(settings.redis_url)

    # --- Dependencies (FastAPI DI) ---
    def get_db_session() -> Session:
        with Session(db.engine) as session:
            yield session

    def get_l1() -> L1Redis:
        return l1

    def get_cfg() -> Settings:
        return settings

    def get_queues() -> Queues:
        return queues

    @app.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse()

    # --- MVP storage implementation (Option A embeddings) ---
    # Principle:
    # - L1 (Redis) stores a sliding window of the current session (fast, short-lived).
    # - L2 (Postgres) stores durable memories + a deterministic fake embedding.
    # This makes the full ingest -> query -> retrieve pipeline real without requiring an external model.

    @app.post("/v1/ingest", response_model=IngestResponse)
    def ingest(
        req: IngestRequest,
        session: Session = Depends(get_db_session),
        l1_store: L1Redis = Depends(get_l1),
        cfg: Settings = Depends(get_cfg),
    ) -> IngestResponse:
        # 1) Write to L1 scratchpad (Redis sliding window)
        append_message(l1_store, req.namespace, req.session_id, req.role.value, req.text, ttl_seconds=3600)

        # 2) Write durable memory to Postgres with a deterministic fake embedding
        memory_id = uuid.uuid4()
        emb = fake_embedding(req.text)

        # NOTE: we pass the vector as a string, e.g. '[0.1, -0.2, ...]'
        # pgvector accepts this format.
        emb_literal = "[" + ",".join(f"{x:.6f}" for x in emb) + "]"

        session.execute(
            text(
                """
                INSERT INTO memories (id, namespace, session_id, role, text, metadata, importance, embedding)
                VALUES (:id, :namespace, :session_id, :role, :text, CAST(:metadata AS jsonb), :importance, :embedding)
                """
            ),
            {
                "id": str(memory_id),
                "namespace": req.namespace,
                "session_id": req.session_id,
                "role": req.role.value,
                "text": req.text,
                "metadata": json.dumps(req.metadata),
                "importance": 0.9 if req.role.value == "user" else 0.6,
                "embedding": emb_literal,
            },
        )

        session.execute(
            text(
                """
                INSERT INTO audit_logs (id, namespace, session_id, event_type, details)
                VALUES (:id, :namespace, :session_id, :event_type, CAST(:details AS jsonb))
                """
            ),
            {
                "id": str(uuid.uuid4()),
                "namespace": req.namespace,
                "session_id": req.session_id,
                "event_type": "INGEST",
                "details": json.dumps({"memory_id": str(memory_id), "l1_window": cfg.l1_window_size}),
            },
        )
        session.commit()

        return IngestResponse(memory_id=str(memory_id))

    @app.post("/v1/query", response_model=QueryResponse)
    def query(
        req: QueryRequest,
        session: Session = Depends(get_db_session),
        l1_store: L1Redis = Depends(get_l1),
        q: Queues = Depends(get_queues),
    ) -> QueryResponse:
        now = int(time.time() * 1000)

        # 0) Always include the L1 sliding window as raw context (chronological)
        l1_msgs = get_window(l1_store, req.namespace, req.session_id)
        l1_text = "\n".join(f"[{m['role']}] {m['text']}" for m in l1_msgs)

        # 1) L2 vector search using deterministic fake embedding
        q_emb = fake_embedding(req.query)
        emb_literal = "[" + ",".join(f"{x:.6f}" for x in q_emb) + "]"

        rows = session.execute(
            text(
                """
                SELECT id, text, role,
                       1 - (embedding <=> :q_embedding) AS score
                FROM memories
                WHERE namespace = :namespace
                  AND embedding IS NOT NULL
                ORDER BY embedding <=> :q_embedding
                LIMIT :k
                """
            ),
            {"q_embedding": emb_literal, "namespace": req.namespace, "k": req.top_k},
        ).mappings().all()

        chunks: list[RetrievedChunk] = []
        for r in rows:
            chunks.append(
                RetrievedChunk(
                    id=str(r["id"]),
                    tier=MemoryTier.L2_SEMANTIC,
                    text=str(r["text"]),
                    score=float(r["score"] or 0.0),
                    metadata={"role": str(r["role"])},
                )
            )

        raw_combined = "\n".join(["[L1]" + "\n" + l1_text] + [f"[L2 score={c.score:.3f}] {c.text}" for c in chunks])

        # 2) Try to reuse latest persisted condensation (produced by worker).
        persisted = latest_condensation(session, req.namespace, req.session_id)
        if persisted:
            condensed, token_original, token_condensed = persisted
        else:
            # If no condensation exists yet, enqueue a background job and return a simple fallback.
            memory_ids = [c.id for c in chunks]
            q.condensation.enqueue(
                "memos_server.condensation.run_condensation_job",
                database_url=settings.database_url,
                namespace=req.namespace,
                session_id=req.session_id,
                memory_ids=memory_ids,
                raw_text=raw_combined,
            )
            condensed = raw_combined[:240] + ("..." if len(raw_combined) > 240 else "")
            token_original = max(1, len(raw_combined) // 4)
            token_condensed = max(1, len(condensed) // 4)

        similarity = float(chunks[0].score) if chunks else 0.0

        session.execute(
            text(
                """
                INSERT INTO audit_logs (id, namespace, session_id, event_type, details)
                VALUES (:id, :namespace, :session_id, :event_type, CAST(:details AS jsonb))
                """
            ),
            {
                "id": str(uuid.uuid4()),
                "namespace": req.namespace,
                "session_id": req.session_id,
                "event_type": "QUERY",
                "details": json.dumps({"top_k": req.top_k, "l2_hits": len(chunks)}),
            },
        )
        session.commit()

        return QueryResponse(
            id=f"ret-{now}",
            source_tier=MemoryTier.L2_SEMANTIC,
            similarity=similarity,
            raw_chunks=chunks,
            condensed_summary=condensed,
            token_usage_original=token_original,
            token_usage_condensed=token_condensed,
            rerank_debug=[],
        )

    @app.get("/v1/ops/stats", response_model=OpsStatsResponse)
    def ops_stats(session: Session = Depends(get_db_session)) -> OpsStatsResponse:
        total = session.execute(text("SELECT COUNT(*) AS c FROM memories")).mappings().one()["c"]
        latest = session.execute(
            text(
                """
                SELECT token_original, token_condensed
                FROM condensations
                ORDER BY created_at DESC
                LIMIT 200
                """
            )
        ).mappings().all()

        token_savings = sum(int(r["token_original"]) - int(r["token_condensed"]) for r in latest) if latest else 0
        ratio = (
            (sum(int(r["token_condensed"]) for r in latest) / sum(int(r["token_original"]) for r in latest))
            if latest and sum(int(r["token_original"]) for r in latest) > 0
            else 0.0
        )

        return OpsStatsResponse(
            total_memories=int(total),
            active_contexts=1,
            token_savings=int(token_savings),
            compression_ratio=float(ratio),
        )

    @app.get("/v1/ops/pipeline", response_model=OpsPipelineResponse)
    def ops_pipeline(
        session: Session = Depends(get_db_session),
        q: Queues = Depends(get_queues),
    ) -> OpsPipelineResponse:
        recent = session.execute(
            text(
                """
                SELECT id, namespace, session_id, token_original, token_condensed, created_at
                FROM condensations
                ORDER BY created_at DESC
                LIMIT 20
                """
            )
        ).mappings().all()

        return OpsPipelineResponse(
            queues=[{"name": "condensation", "count": int(q.condensation.count)}],
            recent_condensations=[
                {
                    "id": str(r["id"]),
                    "namespace": str(r["namespace"]),
                    "session_id": str(r["session_id"]),
                    "token_original": int(r["token_original"]),
                    "token_condensed": int(r["token_condensed"]),
                    "created_at": str(r["created_at"]),
                }
                for r in recent
            ],
        )

    @app.get("/v1/ops/audit", response_model=OpsAuditResponse)
    def ops_audit(
        session: Session = Depends(get_db_session),
        namespace: str | None = None,
        session_id: str | None = None,
        limit: int = 50,
    ) -> OpsAuditResponse:
        limit = max(1, min(limit, 200))

        where = []
        params: dict[str, object] = {"limit": limit}
        if namespace:
            where.append("namespace = :namespace")
            params["namespace"] = namespace
        if session_id:
            where.append("session_id = :session_id")
            params["session_id"] = session_id

        where_sql = "WHERE " + " AND ".join(where) if where else ""

        rows = session.execute(
            text(
                f"""
                SELECT id, namespace, session_id, event_type, details, created_at
                FROM audit_logs
                {where_sql}
                ORDER BY created_at DESC
                LIMIT :limit
                """
            ),
            params,
        ).mappings().all()

        events = []
        for r in rows:
            details_value = r["details"]
            if isinstance(details_value, str):
                try:
                    details_value = json.loads(details_value)
                except Exception:
                    details_value = {"raw": details_value}

            events.append(
                {
                    "id": str(r["id"]),
                    "namespace": str(r["namespace"]),
                    "session_id": str(r["session_id"]),
                    "event_type": str(r["event_type"]),
                    "details": details_value or {},
                    "created_at": str(r["created_at"]),
                }
            )

        return OpsAuditResponse(events=events)

    return app

from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.orm import Session


@dataclass(frozen=True)
class CondensationResult:
    condensation_id: str
    token_original: int
    token_condensed: int


def estimate_tokens(text_value: str) -> int:
    # crude estimate: ~4 chars/token
    return max(1, len(text_value) // 4)


def simple_condense(text_value: str, max_chars: int = 280) -> str:
    """MVP condensation.

    Principle: reduce context size while preserving key facts.
    For MVP we use truncation; later we can replace this with an LLM summarizer.
    """

    value = text_value.strip()
    if len(value) <= max_chars:
        return value
    return value[:max_chars].rstrip() + "..."


def run_condensation_job(
    *,
    database_url: str,
    namespace: str,
    session_id: str,
    memory_ids: list[str],
    raw_text: str,
) -> CondensationResult:
    """RQ worker job: write a condensation row for the given raw context.

    Why this exists:
    - Condensation can be slow (LLM call / heavy processing). It must not block the API.
    - Persisting the result lets the UI show token savings and lets future queries reuse it.
    """

    from memos_server.db import create_db

    db = create_db(database_url)
    condensed = simple_condense(raw_text)
    token_original = estimate_tokens(raw_text)
    token_condensed = estimate_tokens(condensed)

    condensation_id = str(uuid.uuid4())

    with Session(db.engine) as session:
        session.execute(
            text(
                """
                INSERT INTO condensations
                  (id, namespace, session_id, source_memory_ids, condensed_text, token_original, token_condensed)
                VALUES
                  (:id, :namespace, :session_id, :source_memory_ids, :condensed_text, :token_original, :token_condensed)
                """
            ),
            {
                "id": condensation_id,
                "namespace": namespace,
                "session_id": session_id,
                "source_memory_ids": memory_ids,
                "condensed_text": condensed,
                "token_original": token_original,
                "token_condensed": token_condensed,
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
                "namespace": namespace,
                "session_id": session_id,
                "event_type": "CONDENSATION",
                "details": "{}",
            },
        )
        session.commit()

    return CondensationResult(
        condensation_id=condensation_id,
        token_original=token_original,
        token_condensed=token_condensed,
    )


def latest_condensation(session: Session, namespace: str, session_id: str) -> tuple[str, int, int] | None:
    row = (
        session.execute(
            text(
                """
                SELECT condensed_text, token_original, token_condensed
                FROM condensations
                WHERE namespace = :namespace AND session_id = :session_id
                ORDER BY created_at DESC
                LIMIT 1
                """
            ),
            {"namespace": namespace, "session_id": session_id},
        )
        .mappings()
        .first()
    )
    if not row:
        return None
    return (str(row["condensed_text"]), int(row["token_original"]), int(row["token_condensed"]))

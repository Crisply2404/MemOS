from __future__ import annotations

import uuid
from dataclasses import dataclass
import json
import re

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


def structured_condense(raw_text: str) -> str:
    """Produce a lightweight, deterministic 'memory card' summary.

    Goal: upgrade from truncation to a stable structure that preserves key info
    like pitfalls, causes, fixes, commands, and ports.

    Notes:
    - No LLMs here: keep it reproducible for demos and easy to test.
    - Output is JSON so the frontend can render it as sections.
    """

    text_value = raw_text.strip()

    # Heuristics: extract common "action-like" lines and numeric identifiers.
    actions: list[str] = []
    for line in text_value.splitlines():
        s = line.strip()
        if not s:
            continue
        if s.startswith("`") and s.endswith("`"):
            s = s.strip("`").strip()
        if re.match(r"^(docker|git|npm|pnpm|yarn|python|pip|uvicorn|curl)\b", s):
            actions.append(s)

    risks: list[str] = []
    lowered = text_value.lower()
    if "cors" in lowered:
        risks.append("CORS issues in local dev")
    if "connection refused" in lowered or "could not connect" in lowered:
        risks.append("DB/Redis connection refused")
    if "localhost" in lowered or "127.0.0.1" in lowered:
        risks.append("Container vs host networking mismatch (localhost)")

    card = {
        "schema": "memos.memory_card.v2",
        "facts": [],
        "preferences": [],
        "constraints": [],
        "decisions": [],
        "risks": risks,
        "actions": actions[:20],
        # Backwards-compatible aliases for older UI / stored rows.
        "pitfalls": risks,
        "commands": actions[:20],
    }

    # Avoid inflating size: only keep a tiny excerpt when raw context is large.
    if len(text_value) > 800:
        card["raw_excerpt"] = simple_condense(text_value, max_chars=180)

    # Keep output compact and readable in DB (no ASCII escaping).
    return json.dumps(card, ensure_ascii=False, separators=(",", ":"))


def run_condensation_job(
    *,
    database_url: str | None = None,
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

    from memos_server.env import init_env

    from memos_server.db import create_db
    from memos_server.settings import get_settings

    init_env()

    # IMPORTANT: Don't rely on potentially stale/incorrect URLs embedded in queued jobs.
    # The effective runtime configuration should come from the current environment
    # (e.g. MEMOS_DATABASE_URL / MEMOS_REDIS_URL).
    #
    # We keep `database_url` as an optional argument for backwards compatibility with
    # already-enqueued jobs, but we prefer the current settings.
    settings = get_settings()
    effective_db_url = settings.database_url
    if database_url and database_url != effective_db_url:
        # Emit a lightweight warning to make misalignment obvious during demos.
        print(
            "[worker] warning: job database_url differs from runtime settings; "
            f"job={database_url!r} runtime={effective_db_url!r} (using runtime)"
        )

    db = create_db(effective_db_url)
    condensed = structured_condense(raw_text)
    token_original = estimate_tokens(raw_text)
    token_condensed = estimate_tokens(condensed)

    version = "memos.memory_card.v2"
    trigger_reason = "query_no_cached_condensation"
    trigger_details = {
        "source": "api:/v1/query",
        "memory_ids": list(memory_ids),
    }

    condensation_id = str(uuid.uuid4())

    with Session(db.engine) as session:
        session.execute(
            text(
                """
                INSERT INTO condensations
                                    (
                                        id,
                                        namespace,
                                        session_id,
                                        version,
                                        trigger_reason,
                                        trigger_details,
                                        source_memory_ids,
                                        condensed_text,
                                        token_original,
                                        token_condensed
                                    )
                VALUES
                                    (
                                        :id,
                                        :namespace,
                                        :session_id,
                                        :version,
                                        :trigger_reason,
                                        CAST(:trigger_details AS jsonb),
                                        :source_memory_ids,
                                        :condensed_text,
                                        :token_original,
                                        :token_condensed
                                    )
                """
            ),
            {
                "id": condensation_id,
                "namespace": namespace,
                "session_id": session_id,
                                "version": version,
                                "trigger_reason": trigger_reason,
                                "trigger_details": json.dumps(trigger_details),
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

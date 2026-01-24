from __future__ import annotations

import uuid
from dataclasses import dataclass
import json
import re

from sqlalchemy import text
from sqlalchemy.orm import Session

from memos_server.extractor import extract_directive_buckets


@dataclass(frozen=True)
class CondensationResult:
    condensation_id: str
    token_original: int
    token_condensed: int


@dataclass(frozen=True)
class PersistedCondensation:
    id: str
    condensed_text: str
    token_original: int
    token_condensed: int
    created_at: str


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

    def clean_line(line: str) -> str:
        s = line.strip()
        if not s:
            return ""
        if s.startswith("[L1]"):
            return ""
        s = re.sub(r"^\[L2 score=[-\d.]+\]\s*", "", s)
        s = re.sub(r"^\[(user|agent|system|tool)\]\s*", "", s)
        return s.strip()

    cleaned_lines = [clean_line(line) for line in text_value.splitlines()]
    cleaned_lines = [s for s in cleaned_lines if s]

    def uniq(items: list[str]) -> list[str]:
        out: list[str] = []
        seen: set[str] = set()
        for x in items:
            k = x.strip()
            if not k:
                continue
            if k in seen:
                continue
            seen.add(k)
            out.append(k)
        return out

    # Heuristics: extract common "action-like" lines and numeric identifiers.
    actions: list[str] = []
    for s in cleaned_lines:
        if s.startswith("`") and s.endswith("`"):
            s = s.strip("`").strip()
        if re.match(r"^(docker|git|npm|pnpm|yarn|python|pip|uvicorn|curl)\b", s):
            actions.append(s)

    risks: list[str] = []
    for s in cleaned_lines:
        if any(k in s for k in ["踩坑", "坑：", "pitfall", "gotcha"]):
            risks.append(s)

    lowered = text_value.lower()
    if "cors" in lowered:
        if "password authentication failed" in lowered or "500" in lowered:
            risks.append("CORS-like symptom masking backend error (e.g. DB auth / 500)")
        elif "access-control-allow-origin" in lowered or "access-control-allow-headers" in lowered:
            risks.append("CORS header/config mismatch")
    if "connection refused" in lowered or "could not connect" in lowered:
        risks.append("DB/Redis connection refused")
    if "localhost" in lowered or "127.0.0.1" in lowered:
        risks.append("Container vs host networking mismatch (localhost)")

    extracted = extract_directive_buckets(cleaned_lines)

    facts: list[str] = list(extracted.facts)
    preferences: list[str] = list(extracted.preferences)
    constraints: list[str] = list(extracted.constraints)
    decisions: list[str] = list(extracted.decisions)

    # Facts: add stable technical anchors that help debugging and demos.
    for s in cleaned_lines:
        if "/v1/" in s:
            facts.append("API uses versioned prefix (/v1/*)")

        low = s.lower()
        if "postgres" in low and "5432" in s:
            facts.append("postgres port 5432")
        if "redis" in low and "6379" in s:
            facts.append("redis port 6379")
        if ("uvicorn" in low or "memos_server.app" in low or "api" in low) and "8000" in s:
            facts.append("api port 8000")
        if ("npm" in low or "vite" in low) and "3000" in s:
            facts.append("web port 3000")

        if "memos" in s.lower() and ("我们在做" in s or "MemOS" in s):
            facts.append("Project: MemOS (agent memory / context governance)")

        if "pgvector" in s.lower():
            facts.append("L2 uses Postgres + pgvector for vector search")
        if "rq" in s.lower() or "worker" in s.lower():
            facts.append("Async worker processes background jobs (RQ)")

    # Keep concise: avoid overfitting and keep only a few items.
    facts = uniq(facts)[:8]
    preferences = uniq(preferences)[:6]
    constraints = uniq(constraints)[:6]
    decisions = uniq(decisions)[:6]

    card = {
        "schema": "memos.memory_card.v2",
        "facts": facts,
        "preferences": preferences,
        "constraints": constraints,
        "decisions": decisions,
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


def card_to_plain_text(card_json: str) -> str:
    """Convert a stored memory card JSON into a small plain-text working-memory string.

    This is the string we'd actually send to an LLM as "working memory".
    It intentionally hides internal schema/version fields and keeps output short.
    """

    try:
        obj = json.loads(card_json)
        if not isinstance(obj, dict):
            return card_json
        if obj.get("schema") not in ("memos.memory_card.v1", "memos.memory_card.v2"):
            return card_json
        parts: list[str] = []

        def clip(value: object) -> str:
            s = str(value)
            if len(s) <= 140:
                return s
            return s[:140].rstrip() + "…"

        # For rolling summaries, keep stable signals only. Avoid replaying transient "risks"
        # forever (they tend to become noisy after a few iterations).
        for key in ("facts", "decisions", "constraints", "preferences", "actions"):
            items = obj.get(key)
            if isinstance(items, list) and items:
                parts.append(f"{key}: " + "; ".join(clip(x) for x in items[:4]))
        return "\n".join(parts) if parts else card_json
    except Exception:
        return card_json


# Backwards compatibility (older call sites)
def _card_to_plain_text(card_json: str) -> str:  # noqa: D401
    return card_to_plain_text(card_json)


def _fetch_messages(session: Session, memory_ids: list[str]) -> list[dict[str, str]]:
    rows = (
        session.execute(
            text(
                """
                SELECT id, role, text, created_at
                FROM memories
                WHERE id = ANY(CAST(:ids AS uuid[]))
                ORDER BY created_at ASC
                """
            ),
            {"ids": memory_ids},
        )
        .mappings()
        .all()
    )
    out: list[dict[str, str]] = []
    for r in rows:
        out.append({"id": str(r["id"]), "role": str(r["role"]), "text": str(r["text"])})
    return out


def run_condensation_job(
    *,
    database_url: str | None = None,
    namespace: str,
    session_id: str,
    memory_ids: list[str] | None = None,
    raw_text: str | None = None,
    prev_summary_id: str | None = None,
    prev_summary_text: str | None = None,
    trigger_reason: str | None = None,
    trigger_details: dict[str, object] | None = None,
) -> CondensationResult:
    """RQ worker job: write a session-summary snapshot into `condensations`.

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

    version = "memos.session_summary.v1"
    if trigger_reason is None:
        trigger_reason = "rolling_summary_refresh"
    if trigger_details is None:
        trigger_details = {"source": "api:/v1/query", "strategy": "rolling_summary_v1"}

    condensation_id = str(uuid.uuid4())

    with Session(db.engine) as session:
        # Prefer DB fetch for determinism when memory ids are available.
        messages: list[dict[str, str]] = []
        if memory_ids:
            try:
                messages = _fetch_messages(session, memory_ids)
            except Exception:
                messages = []

        prev_hint = ""
        if prev_summary_text:
            prev_hint = card_to_plain_text(prev_summary_text)

        if messages:
            episodic = "\n".join(f"[{m['role']}] {m['text']}" for m in messages)
        else:
            episodic = (raw_text or "").strip()

        combined = "\n".join([p for p in [prev_hint.strip(), episodic.strip()] if p])
        condensed = structured_condense(combined)
        token_original = estimate_tokens(combined)
        token_condensed = estimate_tokens(card_to_plain_text(condensed))

        details = dict(trigger_details)
        details.setdefault("schema", version)
        if prev_summary_id:
            details["prev_summary_id"] = prev_summary_id
        if memory_ids:
            details["new_memory_ids"] = list(memory_ids)

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
                "trigger_details": json.dumps(details),
                "source_memory_ids": (memory_ids or []),
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
                "details": json.dumps({"kind": "session_summary", "version": version}),
            },
        )
        session.commit()

    return CondensationResult(
        condensation_id=condensation_id,
        token_original=token_original,
        token_condensed=token_condensed,
    )


def latest_condensation(session: Session, namespace: str, session_id: str) -> PersistedCondensation | None:
    row = (
        session.execute(
            text(
                """
                SELECT id, condensed_text, token_original, token_condensed, created_at
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
    return PersistedCondensation(
        id=str(row["id"]),
        condensed_text=str(row["condensed_text"]),
        token_original=int(row["token_original"]),
        token_condensed=int(row["token_condensed"]),
        created_at=str(row["created_at"]),
    )

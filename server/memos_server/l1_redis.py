from __future__ import annotations

import json
from dataclasses import dataclass

import redis


@dataclass(frozen=True)
class L1Redis:
    client: redis.Redis
    window_size: int


def create_l1(redis_url: str, window_size: int) -> L1Redis:
    client = redis.Redis.from_url(redis_url, decode_responses=True)
    return L1Redis(client=client, window_size=window_size)


def _key(namespace: str, session_id: str) -> str:
    return f"memos:l1:{namespace}:{session_id}"


def append_message(l1: L1Redis, namespace: str, session_id: str, role: str, text: str, ttl_seconds: int = 3600) -> None:
    """Append a message to the L1 sliding window.

    Principle: L1 is a short-term scratchpad. We keep only last N messages and expire the whole list.
    """

    payload = json.dumps({"role": role, "text": text})
    k = _key(namespace, session_id)
    pipe = l1.client.pipeline()
    pipe.lpush(k, payload)
    pipe.ltrim(k, 0, l1.window_size - 1)
    pipe.expire(k, ttl_seconds)
    pipe.execute()


def get_window(l1: L1Redis, namespace: str, session_id: str) -> list[dict[str, str]]:
    k = _key(namespace, session_id)
    items = l1.client.lrange(k, 0, l1.window_size - 1)
    # lpush makes newest first; reverse to chronological
    out: list[dict[str, str]] = []
    for raw in reversed(items):
        try:
            obj = json.loads(raw)
            if isinstance(obj, dict) and "text" in obj and "role" in obj:
                out.append({"role": str(obj["role"]), "text": str(obj["text"])})
        except Exception:
            continue
    return out

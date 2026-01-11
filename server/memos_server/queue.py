from __future__ import annotations

from dataclasses import dataclass

import redis
from rq import Queue


@dataclass(frozen=True)
class Queues:
    condensation: Queue


def create_queues(redis_url: str) -> Queues:
    """Create RQ queues.

    Why: we want background work (condensation) to run outside request/response.
    This keeps the API fast and makes the system more "agent-prod-like".
    """

    conn = redis.Redis.from_url(redis_url)
    return Queues(condensation=Queue("condensation", connection=conn, default_timeout=60))

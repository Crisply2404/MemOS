from __future__ import annotations

import hashlib
from typing import List


EMBEDDING_DIM = 32


def fake_embedding(text: str, dim: int = EMBEDDING_DIM) -> List[float]:
    """Deterministic "fake" embedding for MVP.

    Why: you chose option A (no real model yet). We still need a stable vector to:
    - exercise the full L2 retrieval path (pgvector cosine search)
    - support de-dup/similarity debugging deterministically

    How it works:
    - SHA256 hash the text
    - interpret bytes into floats in [-1, 1]
    This is NOT semantic, but it is deterministic and fast.
    """

    digest = hashlib.sha256(text.encode("utf-8")).digest()
    # Expand digest deterministically to required dims.
    buf = (digest * ((dim * 2 // len(digest)) + 1))[: dim * 2]
    out: List[float] = []
    for i in range(0, len(buf), 2):
        val = int.from_bytes(buf[i : i + 2], "big")
        out.append((val / 65535.0) * 2.0 - 1.0)
    return out

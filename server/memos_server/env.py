from __future__ import annotations

import os
from functools import lru_cache


@lru_cache(maxsize=1)
def init_env() -> None:
    """Initialize environment for local development.

    MemOS reads configuration from environment variables.
    For local development, we optionally load `server/.env`.

    This is gated behind `MEMOS_LOAD_DOTENV=1` to avoid accidentally reading a
    stray `.env` in non-dev environments.
    """

    if os.getenv("MEMOS_LOAD_DOTENV") != "1":
        return

    try:
        from dotenv import load_dotenv  # type: ignore

        load_dotenv()
    except Exception:
        return

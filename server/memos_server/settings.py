from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the MemOS API.

    Why: we want a single place to configure external dependencies (Redis/Postgres)
    so local dev, docker, and production can share the same code.
    """

    model_config = SettingsConfigDict(env_file=".env", env_prefix="MEMOS_", extra="ignore")

    app_name: str = "memos-server"
    environment: str = "dev"

    # Postgres connection string, e.g.:
    # postgresql+psycopg://postgres:postgres@127.0.0.1:5432/memos
    # NOTE: Defaulting to 127.0.0.1 (not localhost) avoids IPv6 resolution surprises
    # on some Windows setups.
    database_url: str = "postgresql+psycopg://postgres:postgres@127.0.0.1:5432/memos"

    # Redis connection string
    # NOTE: Same rationale as database_url.
    redis_url: str = "redis://127.0.0.1:6379/0"

    # L1 session window size
    l1_window_size: int = 20

    # Session summary (condensation) refresh policy
    summary_refresh_min_new_messages: int = 4
    summary_refresh_max_batch: int = 40
    summary_refresh_lock_seconds: int = 30


def get_settings() -> Settings:
    return Settings()

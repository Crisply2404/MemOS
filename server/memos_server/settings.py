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
    # postgresql+psycopg://postgres:postgres@localhost:5432/memos
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/memos"

    # Redis connection string
    redis_url: str = "redis://localhost:6379/0"

    # L1 session window size
    l1_window_size: int = 20


def get_settings() -> Settings:
    return Settings()

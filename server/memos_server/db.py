from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session


@dataclass(frozen=True)
class Db:
    engine: Engine


def create_db(database_url: str) -> Db:
    # pool_pre_ping helps avoid stale connections during local dev.
    engine = create_engine(database_url, pool_pre_ping=True)
    return Db(engine=engine)


def ensure_schema(engine: Engine) -> None:
    """Ensure required tables/columns exist for local dev.

    This repo intentionally avoids heavy migration frameworks for MVP/demo.
    Instead, we keep an idempotent "ensure" step so existing local DBs keep working
    after pulling new changes.
    """

    with Session(engine) as session:
        # --- Condensations (session summary snapshots) ---
        # Older local DBs might still have `version` as INTEGER; align it to TEXT.
        try:
            row = (
                session.execute(
                    text(
                        """
                        SELECT data_type
                        FROM information_schema.columns
                        WHERE table_name = 'condensations' AND column_name = 'version'
                        """
                    )
                )
                .mappings()
                .first()
            )
            if row and str(row.get("data_type")) == "integer":
                session.execute(
                    text(
                        """
                        ALTER TABLE condensations
                        ALTER COLUMN version TYPE TEXT USING version::text
                        """
                    )
                )
                session.execute(text("ALTER TABLE condensations ALTER COLUMN version SET DEFAULT 'v1'"))
        except Exception:
            # If the table doesn't exist yet, docker init SQL will create it.
            pass

        # Ensure trigger metadata columns exist (older init schema might not have them).
        try:
            session.execute(text("ALTER TABLE condensations ADD COLUMN IF NOT EXISTS trigger_reason TEXT"))
            session.execute(
                text("ALTER TABLE condensations ADD COLUMN IF NOT EXISTS trigger_details JSONB NOT NULL DEFAULT '{}'::jsonb")
            )
        except Exception:
            pass

        # --- Context packs (working memory snapshots) ---
        session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS context_packs (
                  id UUID PRIMARY KEY,
                  namespace TEXT NOT NULL,
                  session_id TEXT NOT NULL,
                  query_text TEXT NOT NULL,
                  session_summary_id UUID,
                  retrieved_memory_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
                  pack JSONB NOT NULL,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )
        )
        session.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS idx_context_packs_namespace_session_created_at
                  ON context_packs(namespace, session_id, created_at DESC);
                """
            )
        )
        session.commit()


def run_health_check(db: Db) -> None:
    with Session(db.engine) as session:
        session.execute(text("SELECT 1"))

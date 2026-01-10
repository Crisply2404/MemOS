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


def run_health_check(db: Db) -> None:
    with Session(db.engine) as session:
        session.execute(text("SELECT 1"))

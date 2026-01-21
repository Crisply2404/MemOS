from __future__ import annotations

"""RQ worker entrypoint.

How to run locally:

  cd server
  source .venv/bin/activate
  python worker.py

This process listens to the Redis-backed queue and executes background jobs.
"""

import os

import redis
from rq import SimpleWorker, Worker

from memos_server.env import init_env


def main() -> None:
  init_env()

  redis_url = os.getenv("MEMOS_REDIS_URL", "redis://localhost:6379/0")
  conn = redis.Redis.from_url(redis_url)

  # RQ's default Worker uses os.fork(), which doesn't exist on Windows.
  # On Windows we use SimpleWorker (runs jobs in-process).
  worker_cls = SimpleWorker if os.name == "nt" else Worker
  worker = worker_cls(["condensation"], connection=conn)

  # Make failures loud during local dev/demo so queue stalls are obvious.
  def on_exception(job, exc_type, exc_value, tb):  # type: ignore[no-untyped-def]
    try:
      job_id = getattr(job, "id", "unknown")
      print(f"[worker] job failed id={job_id} type={exc_type.__name__}: {exc_value}")
    except Exception:
      print("[worker] job failed (unable to format exception)")

  worker.push_exc_handler(on_exception)
  worker.work(with_scheduler=False)


if __name__ == "__main__":
  main()

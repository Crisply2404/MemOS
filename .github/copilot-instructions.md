# MemOS — Copilot instructions

Use these notes to be productive in this repo. Keep guidance factual (based on files in this workspace), and keep commit messages plain-language.

## Big picture (service boundaries)

- Frontend: Vite + React dashboard in `/` and `components/`.
- Backend: FastAPI “Memory Controller” in `server/memos_server/`.
- Storage: Redis = L1 scratchpad + RQ queue; Postgres+pgvector = L2 semantic store + audit + condensations.
- Async: `server/worker.py` runs RQ worker (condensation jobs).

Data flow:

- UI -> `POST /v1/ingest` writes L1 (Redis window) + L2 (Postgres).
- UI -> `POST /v1/query` reads L1 + vector-searches L2 and returns `raw_chunks` + `condensed_summary`.
- If no persisted condensation exists, `/v1/query` enqueues a condensation job; the worker persists a memory-card summary into `condensations`.

## Key files

- API routes + behavior: `server/memos_server/app.py`
- Condensation schema + worker job: `server/memos_server/condensation.py`
- Runtime config: `server/memos_server/settings.py` (env prefix `MEMOS_`)
- Queue wiring: `server/memos_server/queue.py`, worker entrypoint: `server/worker.py`
- UI RAG view (renders structured cards): `components/RagDebugger.tsx`
- Ops views: `components/MemoryPipeline.tsx`, `components/AuditPanel.tsx`

## Local dev workflows (Windows)

- Deps (Postgres+Redis): `docker compose up -d postgres redis`
- Backend API: `cd server; .venv\Scripts\python -m uvicorn memos_server.app:create_app --factory --reload --port 8000`
- Worker (Windows uses RQ SimpleWorker): `cd server; .venv\Scripts\python worker.py`
- Frontend: `npm run dev -- --port 3000`

## Conventions / gotchas

- Avoid “localhost” confusion: defaults prefer `127.0.0.1` for local dev.
- Condensation jobs should not trust stale connection URLs embedded in queued jobs; resolve from runtime settings.
- UI defaults to a single namespace (`Project_X`) and uses session IDs like `web-<uuid>`; Pipeline should default to the current session.

## Docs to keep in sync

- Record milestones and verification steps in `docs/PROJECT_LOG.md`.
- Keep `docs/ROADMAP_TODO.md` checkboxes aligned with reality.

## Commit messages

- Use plain-language outcomes; avoid internal shorthand (no `E1`, `P0`, `TODO5`).
- Prefer: `feat: structured memory card condensation + UI rendering`.

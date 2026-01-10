BEGIN;

-- Why SQL init files:
-- For a portfolio/MVP repo, this keeps setup simple: `docker compose up` creates the schema.
-- Later we can replace this with Alembic migrations.

CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY,
  namespace TEXT NOT NULL,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  text TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  importance REAL NOT NULL DEFAULT 0.5,
  embedding vector(32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memories_namespace_created_at ON memories(namespace, created_at DESC);

-- pgvector cosine distance index for similarity search
CREATE INDEX IF NOT EXISTS idx_memories_embedding_cosine
  ON memories
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE TABLE IF NOT EXISTS condensations (
  id UUID PRIMARY KEY,
  namespace TEXT NOT NULL,
  session_id TEXT NOT NULL,
  source_memory_ids UUID[] NOT NULL,
  condensed_text TEXT NOT NULL,
  token_original INTEGER NOT NULL,
  token_condensed INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_condensations_namespace_session_created_at
  ON condensations(namespace, session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  namespace TEXT NOT NULL,
  session_id TEXT,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_namespace_created_at ON audit_logs(namespace, created_at DESC);

COMMIT;

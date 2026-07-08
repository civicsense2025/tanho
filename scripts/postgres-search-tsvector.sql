-- Template for a drizzle-kit --custom migration, applied AFTER swapping to
-- Postgres. Creates the full-text search table adapters/search/postgres-
-- tsvector.ts reads/writes — NOT Drizzle-schema-managed because drizzle-core
-- has no tsvector / GENERATED ALWAYS AS (...) STORED column builder (the
-- same reason FTS5's virtual table isn't schema-managed on the SQLite side
-- either — see drizzle/0024_search_fts5.sql).
--
-- Usage:
--   npx drizzle-kit generate --custom --name add-search-tsvector
--   # then replace that empty file's contents with this file's contents
--   npm run db:migrate
--
-- search_vector is a STORED generated column (recomputed automatically by
-- Postgres on every INSERT/UPDATE — the adapter never writes to it
-- directly), weighted 'A' for title and 'B' for body so a title match ranks
-- above a body-only match. The GIN index is what makes `@@` fast at scale;
-- without it this table would still be correct, just doing a sequential
-- scan per query.

CREATE TABLE IF NOT EXISTS search_index (
  id text PRIMARY KEY,
  type text NOT NULL,
  source_id text NOT NULL,
  path text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  gate_json jsonb,
  updated_at bigint NOT NULL,
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(body, '')), 'B')
  ) STORED
);

CREATE INDEX IF NOT EXISTS search_index_vector_idx ON search_index USING GIN (search_vector);

-- Matches every other table's RLS posture from the swap recipe's own
-- .enableRLS()/pgPolicy() step — this table isn't Drizzle-managed so it
-- doesn't get that automatically, but it holds the same class of content
-- (indexed page/entry/product text) and should be gated identically.
ALTER TABLE search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_index FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_index' AND policyname = 'search_index_app_only'
  ) THEN
    CREATE POLICY search_index_app_only ON search_index
      FOR ALL TO lamina_app
      USING (true) WITH CHECK (true);
  END IF;
END
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON search_index TO lamina_app;

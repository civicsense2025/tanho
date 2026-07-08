-- Template for a drizzle-kit --custom migration, applied AFTER swapping to
-- Postgres and running scripts/swap-db-dialect.ts (which adds .enableRLS()
-- and a per-table pgPolicy() granting the "lamina_app" role full access).
--
-- Usage:
--   npx drizzle-kit generate --custom --name enable-force-rls
--   # then replace that empty file's contents with this file's contents
--   npm run db:migrate
--
-- What this does, beyond ENABLE ROW LEVEL SECURITY (which Drizzle already
-- emits from .enableRLS()): creates the lamina_app role if missing, grants it
-- table/sequence privileges matching what its RLS policies already allow,
-- and applies FORCE ROW LEVEL SECURITY — the one statement Drizzle has no
-- schema-level API for, which closes the "connection is also table owner"
-- RLS bypass. See docs/recipes/swap-database-to-postgres.md "Create the
-- app role" for how to set this role's login password (never put a real
-- password in a migration file — it's committed to git).
--
-- IMPORTANT — Supabase specifically: this does NOT block Supabase's own
-- "postgres" and "service_role" roles, because Supabase grants both the
-- BYPASSRLS attribute by platform design (FORCE ROW LEVEL SECURITY has no
-- effect on a role with BYPASSRLS — this is standard Postgres behavior,
-- not a gap in this migration). Those two credentials are meant to be
-- full-trust, equivalent to holding DATABASE_URL itself. This migration's
-- real protection is against a LEAKED "anon"/"authenticated" Supabase API
-- key being used to read/write your tables directly via PostgREST or the
-- SQL editor — verified: those roles see zero rows from a locked table
-- once this migration is applied.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lamina_app') THEN
    CREATE ROLE lamina_app WITH LOGIN NOINHERIT;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO lamina_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lamina_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO lamina_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO lamina_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO lamina_app;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END
$$;

import { Pool } from "pg";
import type { Gate } from "@/modules/entitlements/gate";
import type { SearchAdapter, SearchDocument, SearchDocumentType, SearchHit } from "../types";
import { toPostgresWebSearchQuery } from "./query-sanitize";

/**
 * Postgres/Supabase full-text search via a generated `tsvector` column + GIN
 * index — the dialect used once a site runs
 * docs/recipes/swap-database-to-postgres.md's codemod. Verified identically
 * against a real, unmodified PostgreSQL 17 instance (no Supabase-specific
 * extension needed — `websearch_to_tsquery`/`ts_rank_cd`/`ts_headline` are
 * core Postgres, confirmed working the same way on vanilla Postgres and
 * Supabase-hosted Postgres per that recipe's own framing).
 *
 * Unlike fts5.ts, this adapter opens its OWN `pg.Pool` from `DATABASE_URL`
 * rather than reaching through `db.$client` — src/lib/db/client.ts still
 * imports `@libsql/client` unconditionally (the swap codemod only rewrites
 * it to node-postgres AFTER a real dialect swap), so this file can't assume
 * `db.$client` is a Pool. The search factory (adapters/search/index.ts) only
 * ever constructs this adapter once it has independently confirmed
 * DATABASE_URL is a postgres:// URL, so opening a second small pool here (one
 * pool for search, Drizzle's own pool for everything else once swapped) is
 * the simplest correct design — not a workaround.
 *
 * The `search_index` table + its generated column/index are NOT
 * Drizzle-schema-managed for the same reason FTS5 isn't in fts5.ts:
 * drizzle-core has no `tsvector`/`GENERATED ALWAYS AS (...) STORED` column
 * builder. Created by drizzle/postgres-search-tsvector.sql, a `--custom`
 * migration step documented as its own step in
 * docs/recipes/swap-database-to-postgres.md, run the same way that recipe's
 * existing FORCE-RLS custom migration already is.
 */
const TABLE = "search_index";
const HARD_MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

type SearchRow = {
  id: string;
  type: string;
  source_id: string;
  path: string;
  title: string;
  updated_at: string; // bigint comes back as a string from node-postgres by default
  gate_json: Record<string, unknown> | null; // jsonb comes back already-parsed
  score: number;
  snippet: string;
};

function toDocumentType(type: string): SearchDocumentType {
  if (type === "page" || type === "entry" || type === "product" || type === "content") return type;
  throw new Error(`search_index: unexpected document type "${type}" in a stored row`);
}

export const postgresSearch: SearchAdapter = {
  async isConfigured(): Promise<boolean> {
    const r = await getPool().query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
      [TABLE],
    );
    return (r.rowCount ?? 0) > 0;
  },

  async index(document: SearchDocument): Promise<void> {
    // A real UPSERT (unlike fts5.ts's delete+insert) — Postgres supports
    // ON CONFLICT natively and title/body are plain columns here (the
    // tsvector column is GENERATED, so it recomputes automatically on this
    // same statement — no separate step needed).
    await getPool().query(
      `INSERT INTO ${TABLE} (id, type, source_id, path, title, body, gate_json, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         type = EXCLUDED.type,
         source_id = EXCLUDED.source_id,
         path = EXCLUDED.path,
         title = EXCLUDED.title,
         body = EXCLUDED.body,
         gate_json = EXCLUDED.gate_json,
         updated_at = EXCLUDED.updated_at`,
      [
        document.id,
        document.type,
        document.sourceId,
        document.path,
        document.title,
        document.body,
        document.gate ? JSON.stringify(document.gate) : null,
        document.updatedAt,
      ],
    );
  },

  async remove(id: string): Promise<void> {
    await getPool().query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
  },

  async search(query: string, opts?: { types?: SearchDocumentType[]; limit?: number }): Promise<SearchHit[]> {
    const tsQuery = toPostgresWebSearchQuery(query);
    if (!tsQuery) return [];

    const limit = Math.min(opts?.limit ?? DEFAULT_LIMIT, HARD_MAX_LIMIT);
    const typeFilter = opts?.types?.length ? opts.types : null;

    // $1 = the sanitized query string (fed to websearch_to_tsquery inline —
    // never string-concatenated into the SQL), $2 = an ACTUAL Postgres array
    // parameter (ANY($2::text[])), never a hand-built IN(...) list.
    const typeClause = typeFilter ? "AND type = ANY($2::text[])" : "";
    const limitParam = typeFilter ? "$3" : "$2";
    const args: unknown[] = typeFilter ? [tsQuery, typeFilter, limit] : [tsQuery, limit];

    const r = await getPool().query<SearchRow>(
      `SELECT
         id, type, source_id, path, title, updated_at, gate_json,
         ts_rank_cd(search_vector, websearch_to_tsquery('english', $1)) AS score,
         ts_headline(
           'english', body, websearch_to_tsquery('english', $1),
           'StartSel=<mark>, StopSel=</mark>, MaxFragments=1, MaxWords=20, MinWords=5'
         ) AS snippet
       FROM ${TABLE}
       WHERE search_vector @@ websearch_to_tsquery('english', $1) ${typeClause}
       ORDER BY score DESC
       LIMIT ${limitParam}`,
      args,
    );

    return r.rows.map((row) => ({
      document: {
        id: row.id,
        type: toDocumentType(row.type),
        sourceId: row.source_id,
        title: row.title,
        body: "", // full body isn't needed by a result list; snippet carries the match context
        path: row.path,
        gate: row.gate_json as Gate | null,
        updatedAt: Number(row.updated_at),
      },
      score: row.score,
      snippet: row.snippet,
    }));
  },
};

import { createClient, type Client } from "@libsql/client";
import type { Gate } from "@/modules/entitlements/gate";
import type { SearchAdapter, SearchDocument, SearchDocumentType, SearchHit } from "../types";
import { toFts5MatchQuery } from "./query-sanitize";

/**
 * SQLite/libSQL (default dialect, plus Turso-hosted) full-text search via an
 * FTS5 virtual table. FTS5 has no Drizzle schema representation (drizzle-kit
 * generate can't emit `CREATE VIRTUAL TABLE ... USING fts5`), so the table is
 * created by a hand-authored migration (drizzle/0024_search_fts5.sql) rather
 * than a schema.ts-generated one — see that file's own header comment. This
 * adapter reaches for a raw libsql client (rather than Drizzle's query
 * builder) for the same reason: there's no Drizzle table object to build a
 * query against.
 *
 * Deliberately does NOT import `db` from `@/lib/db/client` and reach
 * `db.$client` — that file's `createClient(...)` call runs at ITS OWN module
 * top level and throws synchronously on a non-libsql-scheme DATABASE_URL
 * (postgres://, a malformed string). The search factory
 * (adapters/search/index.ts) picks exactly one of fts5Search/postgresSearch
 * per DATABASE_URL, but both files are still reachable via static imports
 * from other code (this file's own test, the factory itself) — so each
 * adapter must be safe to IMPORT standalone regardless of the current
 * DATABASE_URL's shape, the same way postgres-tsvector.ts already only opens
 * its pg.Pool lazily inside getPool() rather than at module scope. This
 * client mirrors that: created lazily, once, on first real use.
 *
 * `id` and `type`/`path`/`updated_at`/`gate_json` are UNINDEXED (FTS5 stores
 * them but never full-text-matches against them — they're metadata, not
 * search text); only `title`/`body` are matched. Ranking uses bm25() (lower
 * = better match, hence ORDER BY ... ASC — SQLite's own convention, verified
 * directly rather than assumed) combined with snippet() for the result
 * fragment, in one query.
 */
const TABLE = "search_index_fts";
const HARD_MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
/** snippet() column indices, 0-based over the columns AS DECLARED in the
 *  virtual table (see the migration): id=0, type=1, source_id=2, path=3,
 *  updated_at=4, gate_json=5, title=6, body=7. Body (7) is what a snippet is
 *  drawn from — verified directly against the real 8-column schema rather
 *  than assumed (an earlier off-by-one here, from miscounting source_id out
 *  of this list, silently returned the TITLE as every result's snippet). */
const BODY_COLUMN_INDEX = 7;

let client: Client | null = null;
function getClient(): Client {
  if (!client) {
    client = createClient({
      url: process.env.DATABASE_URL ?? "file:./data/dev.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

type FtsRow = {
  id: string;
  type: string;
  source_id: string;
  path: string;
  title: string;
  updated_at: number;
  gate_json: string | null;
  score: number;
  snip: string;
};

function toDocumentType(type: string): SearchDocumentType {
  if (type === "page" || type === "entry" || type === "product" || type === "content") return type;
  throw new Error(`search_index_fts: unexpected document type "${type}" in a stored row`);
}

function parseGate(json: string | null): Gate | null {
  if (!json) return null;
  return JSON.parse(json) as Gate;
}

export const fts5Search: SearchAdapter = {
  async isConfigured(): Promise<boolean> {
    const r = await getClient().execute({
      sql: "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
      args: [TABLE],
    });
    return r.rows.length > 0;
  },

  async index(document: SearchDocument): Promise<void> {
    // Single execute(), not batch() — this is a per-document upsert hook
    // (see modules/search/*'s indexing pipeline), never a bulk load, so
    // there's no need to depend on batch()'s behavior against a virtual
    // table either way. FTS5 has no native UPSERT; delete-then-insert is the
    // standard pattern (and matches the delete+insert this adapter's own
    // `remove` performs).
    await getClient().execute({
      sql: `DELETE FROM ${TABLE} WHERE id = ?`,
      args: [document.id],
    });
    await getClient().execute({
      sql: `INSERT INTO ${TABLE}(id, type, source_id, path, updated_at, gate_json, title, body)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        document.id,
        document.type,
        document.sourceId,
        document.path,
        document.updatedAt,
        document.gate ? JSON.stringify(document.gate) : null,
        document.title,
        document.body,
      ],
    });
  },

  async remove(id: string): Promise<void> {
    await getClient().execute({
      sql: `DELETE FROM ${TABLE} WHERE id = ?`,
      args: [id],
    });
  },

  async search(query: string, opts?: { types?: SearchDocumentType[]; limit?: number }): Promise<SearchHit[]> {
    const matchQuery = toFts5MatchQuery(query);
    if (!matchQuery) return [];

    const limit = Math.min(opts?.limit ?? DEFAULT_LIMIT, HARD_MAX_LIMIT);
    const typeFilter = opts?.types?.length ? opts.types : null;

    // sqlite/libsql has no array bind param — expand an explicit `(?, ?, ...)`
    // placeholder list sized to the caller's own types array (never
    // interpolating the type STRINGS themselves, only their count).
    const typeClause = typeFilter ? `AND type IN (${typeFilter.map(() => "?").join(", ")})` : "";
    const args: (string | number)[] = [matchQuery, ...(typeFilter ?? []), limit];

    const r = await getClient().execute({
      sql: `
        SELECT
          id, type, source_id, path, title, updated_at, gate_json,
          bm25(${TABLE}) AS score,
          snippet(${TABLE}, ${BODY_COLUMN_INDEX}, '<mark>', '</mark>', '…', 12) AS snip
        FROM ${TABLE}
        WHERE ${TABLE} MATCH ? ${typeClause}
        ORDER BY score ASC
        LIMIT ?
      `,
      args,
    });

    return (r.rows as unknown as FtsRow[]).map((row) => ({
      document: {
        id: row.id,
        type: toDocumentType(row.type),
        sourceId: row.source_id,
        title: row.title,
        body: "", // full body isn't needed by a result list; snip carries the match context
        path: row.path,
        gate: parseGate(row.gate_json),
        updatedAt: row.updated_at,
      },
      score: row.score,
      snippet: row.snip,
    }));
  },
};

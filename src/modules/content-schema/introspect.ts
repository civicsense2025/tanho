import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assertIdentifier } from "./identifiers";
import { currentDialect } from "./dialect";

/**
 * Runtime reflection of a `ct_*` table's real shape, for the "verify content
 * schema" reconcile action — the safety net for the parallel migration lane
 * (content-type tables live outside drizzle/*.sql, so nothing else tracks
 * them). Dialect-aware exactly like the search adapters already are:
 * `sqlite_master`/PRAGMA on SQLite (src/adapters/search/fts5.ts), the
 * `information_schema` on Postgres (src/adapters/data-source/postgres.ts).
 */

/** Whether a physical table currently exists. */
export async function tableExists(tableName: string): Promise<boolean> {
  const t = assertIdentifier(tableName);
  if (currentDialect() === "postgres") {
    const rows = await db.all<{ one: number }>(
      sql`SELECT 1 AS one FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ${t} LIMIT 1`,
    );
    return rows.length > 0;
  }
  const rows = await db.all<{ one: number }>(
    sql`SELECT 1 AS one FROM sqlite_master WHERE type = 'table' AND name = ${t} LIMIT 1`,
  );
  return rows.length > 0;
}

/** The column names currently present on a table (empty if it doesn't exist). */
export async function tableColumns(tableName: string): Promise<string[]> {
  const t = assertIdentifier(tableName);
  if (currentDialect() === "postgres") {
    const rows = await db.all<{ column_name: string }>(
      sql`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${t} ORDER BY ordinal_position`,
    );
    return rows.map((r) => r.column_name);
  }
  // PRAGMA can't be parameterized or take a bound arg via the sql template, so
  // interpolate the already-validated identifier directly.
  const rows = await db.all<{ name: string }>(
    sql.raw(`PRAGMA table_info("${t.replace(/"/g, '""')}")`),
  );
  return rows.map((r) => r.name);
}

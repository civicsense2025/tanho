import { sql, type SQL } from "drizzle-orm";
import { db } from "./client";
import { currentDialect } from "@/modules/content-schema/dialect";

/**
 * Dialect-agnostic RAW SQL execution for the content-schema DDL engine (the one
 * place that builds `CREATE TABLE`/`SELECT * FROM <dynamic table>` by hand, since
 * per-custom-type tables don't exist as Drizzle schema objects).
 *
 * The problem this solves: SQLite's Drizzle exposes `db.run(sql)` (writes) and
 * `db.all<T>(sql)` (reads); node-postgres's Drizzle exposes neither — it has
 * `db.execute(sql)` returning `{ rows }`. So a codebase that must run on EITHER
 * driver can't call the driver-specific terminators directly. These two helpers
 * branch on the active dialect at runtime and present one portable surface.
 *
 * `db` is typed as whichever driver the client factory currently uses (swapped at
 * build time by scripts/swap-db-dialect.ts), so we reach both method families
 * through a minimal structural cast — the runtime branch guarantees only the
 * method that exists on the live driver is ever called.
 */
type RawDb = {
  run?: (query: SQL) => Promise<unknown>;
  all?: <T>(query: SQL) => Promise<T[]>;
  execute?: <T = Record<string, unknown>>(query: SQL) => Promise<{ rows: T[] }>;
};

// Access `db` through the live binding on each call, not a module-load-time
// capture. A `const raw = db` would freeze the reference at import time,
// bypassing vi.mock's getter in tests that swap the db between cases.
function rawDb(): RawDb {
  return db as unknown as RawDb;
}

/** Execute a write/DDL statement (INSERT/UPDATE/DELETE/ALTER/CREATE/DROP). */
export async function rawRun(query: SQL): Promise<void> {
  const raw = rawDb();
  if (currentDialect() === "postgres") {
    await raw.execute!(query);
  } else {
    await raw.run!(query);
  }
}

/** Execute a read and return the rows as `T[]`, on either driver. */
export async function rawAll<T>(query: SQL): Promise<T[]> {
  const raw = rawDb();
  if (currentDialect() === "postgres") {
    const res = await raw.execute!<T>(query);
    return res.rows;
  }
  return raw.all!<T>(query);
}

/** Re-export `sql` so callers import raw-SQL building + execution from one place. */
export { sql };

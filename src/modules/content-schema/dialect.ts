/**
 * Runtime dialect detection for the content-schema DDL engine.
 *
 * The primary database is swappable (libSQL/SQLite by default, Postgres after
 * the `scripts/swap-db-dialect.ts` codemod — see
 * docs/recipes/swap-database-to-postgres.md). Unlike the STATIC schema, the
 * `ct_*` content-type tables are created at RUNTIME by this module's DDL, so
 * we must emit the right column types / RLS statements for whichever dialect
 * the primary DB currently is. We detect it exactly the way the search-adapter
 * factory does (src/adapters/search/index.ts): off the `DATABASE_URL` scheme.
 *
 * There is no MySQL branch — the swap recipe ships Postgres + SQLite, and the
 * content-schema engine follows that same supported set.
 */
export type Dialect = "sqlite" | "postgres";

const POSTGRES_SCHEMES = ["postgres:", "postgresql:"];

/** True when DATABASE_URL is a Postgres connection string. */
export function isPostgresUrl(databaseUrl: string): boolean {
  try {
    return POSTGRES_SCHEMES.includes(new URL(databaseUrl).protocol);
  } catch {
    // A bare file path (`file:./data/dev.db`) or malformed value is not
    // Postgres — the default libSQL/SQLite dialect.
    return false;
  }
}

/** The primary DB's current dialect, read from DATABASE_URL at call time. */
export function currentDialect(): Dialect {
  const url = process.env.DATABASE_URL ?? "file:./data/dev.db";
  return isPostgresUrl(url) ? "postgres" : "sqlite";
}

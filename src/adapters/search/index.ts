import type { SearchAdapter } from "../types";
import { fts5Search } from "./fts5";
import { postgresSearch } from "./postgres-tsvector";

const POSTGRES_SCHEMES = ["postgres:", "postgresql:"];

/**
 * The active search adapter, inferred from DATABASE_URL's scheme — the same
 * "read an existing signal" precedent adapters/payments/index.ts already
 * uses for STRIPE_SECRET_KEY, applied here to the primary-database swap
 * (docs/recipes/swap-database-to-postgres.md) instead of a payments
 * provider. No new env var: a self-hoster who has already swapped their
 * primary DB to Postgres gets Postgres-backed search automatically, with
 * nothing extra to configure.
 *
 * `new URL(...)` throws on a bare Turso hostname without a scheme prefix —
 * guarded below, falling through to the FTS5/libSQL default (the same
 * outcome as an unset DATABASE_URL, which src/lib/db/client.ts itself
 * defaults to a local libSQL file for).
 */
function isPostgresUrl(databaseUrl: string): boolean {
  try {
    return POSTGRES_SCHEMES.includes(new URL(databaseUrl).protocol);
  } catch {
    return false;
  }
}

export const search: SearchAdapter =
  process.env.DATABASE_URL && isPostgresUrl(process.env.DATABASE_URL) ? postgresSearch : fts5Search;

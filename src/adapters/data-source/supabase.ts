import type { PostgresConfig, SupabaseConfig } from "@/modules/data-sources/validation";
import { PostgresDataSourceAdapter } from "./postgres";

/**
 * Supabase is wire-compatible Postgres, so this is a thin config preset —
 * NOT a separate driver. Translates project ref + database password into
 * the same PostgresConfig shape and delegates entirely to
 * PostgresDataSourceAdapter.
 *
 * IMPORTANT: `databasePassword` is the `postgres` role's own DB password
 * (Dashboard > Settings > Database), never the service-role API key — the
 * service-role key is a JWT valid only for PostgREST/GoTrue HTTP calls and
 * cannot authenticate a raw Postgres wire-protocol connection.
 */
export function buildSupabasePostgresConfig(config: SupabaseConfig): PostgresConfig {
  const host = config.usePooler
    ? `aws-0-${config.region ?? "us-east-1"}.pooler.supabase.com`
    : `db.${config.projectRef}.supabase.co`;
  const user = config.usePooler ? `postgres.${config.projectRef}` : "postgres";
  const port = config.usePooler ? 6543 : 5432;

  return {
    provider: "postgres",
    host,
    port,
    database: config.database,
    user,
    password: config.databasePassword,
  };
}

export class SupabaseDataSourceAdapter extends PostgresDataSourceAdapter {
  constructor(config: SupabaseConfig) {
    super(buildSupabasePostgresConfig(config));
  }
}

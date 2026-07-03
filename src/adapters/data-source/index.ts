import type { DataSourceConfig } from "@/modules/data-sources/validation";
import type { DataSourceAdapter } from "../types";
import { NullDataSourceAdapter } from "./null";
import { PostgresDataSourceAdapter } from "./postgres";
import { SupabaseDataSourceAdapter } from "./supabase";

/**
 * Per-connection factory — unlike other adapters (storage/payments/email),
 * this is NOT a single env-driven singleton, since a self-hoster can
 * configure many external database connections across providers
 * simultaneously. Callers always pass the specific connection's decrypted
 * config; nothing here reads process.env directly.
 */
export function getDataSourceAdapter(connection: {
  provider: "postgres" | "supabase";
  config: DataSourceConfig;
}): DataSourceAdapter {
  switch (connection.provider) {
    case "postgres":
      if (connection.config.provider !== "postgres") return new NullDataSourceAdapter();
      return new PostgresDataSourceAdapter(connection.config);
    case "supabase":
      if (connection.config.provider !== "supabase") return new NullDataSourceAdapter();
      return new SupabaseDataSourceAdapter(connection.config);
    default:
      return new NullDataSourceAdapter();
  }
}

import type { DataSourceAdapter, DataSourceQueryResult, QuerySpec, TableDesc } from "../types";

/**
 * Used when a connection's config can't be decrypted/parsed. Keeps every
 * call site importable and failing closed with a clear, safe error rather
 * than throwing on `undefined`.
 */
export class NullDataSourceAdapter implements DataSourceAdapter {
  isConfigured(): boolean {
    return false;
  }

  capabilities(): { read: boolean; write: boolean } {
    return { read: false, write: false };
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    return { ok: false, error: "not configured" };
  }

  async listTables(): Promise<TableDesc[]> {
    return [];
  }

  async query(_spec: QuerySpec): Promise<DataSourceQueryResult> {
    throw new Error("data source not configured");
  }
}

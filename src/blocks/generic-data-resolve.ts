import { getDataSourceAdapter } from "@/adapters/data-source";
import type { QuerySpec } from "@/adapters/types";
import { getConnection } from "@/modules/data-sources/queries";
import { openConnectionConfig } from "@/modules/data-sources/crypto";
import { allowDataSourceQuery } from "@/modules/data-sources/rate-limit";
import type { DataSourceBinding } from "@/modules/data-sources/validation";

export type GenericDataResolved = {
  rows: Record<string, unknown>[];
  truncated: boolean;
} | null;

/**
 * Shared server-only resolver for ANY block whose content declares an
 * optional `dataSource: DataSourceBinding` (see modules/data-sources/
 * validation.ts). Not table-specific — other blocks can adopt the same
 * `dataSource` field and register here too.
 *
 * Returns null (never throws to the walker) when unbound, misconfigured,
 * rate-limited, or disallowed — the block's Render then falls back to its
 * own static/empty state. The owner-defined allowlist is re-checked here
 * regardless of what the block's saved content claims, since block content
 * is editor-editable while the allowlist is the actual security boundary.
 */
export async function resolveGenericData(
  content: Record<string, unknown>,
): Promise<GenericDataResolved> {
  const binding = (content as { dataSource?: DataSourceBinding }).dataSource;
  if (!binding) return null;

  if (!(await allowDataSourceQuery(binding.connectionId))) {
    console.warn(`[data-sources] rate-limited query for connection ${binding.connectionId}`);
    return null;
  }

  const connection = await getConnection(binding.connectionId);
  if (!connection) return null;

  const config = openConnectionConfig(connection.configEncrypted);
  if (!config) {
    console.warn(`[data-sources] could not open sealed config for connection ${connection.id}`);
    return null;
  }

  const allowedTable = connection.allowlistJson.find((entry) => entry.table === binding.table);
  if (!allowedTable) {
    console.warn(`[data-sources] table "${binding.table}" is not allowlisted for connection ${connection.id}`);
    return null;
  }
  const allowedColumnSet = new Set(allowedTable.columns);
  const columns = binding.columns.filter((c) => allowedColumnSet.has(c));
  if (columns.length === 0) return null;

  const spec: QuerySpec = {
    table: binding.table,
    columns,
    filters: binding.filters?.filter((f) => allowedColumnSet.has(f.column)),
    sort: binding.sort?.filter((s) => allowedColumnSet.has(s.column)),
    limit: binding.limit,
  };

  try {
    const adapter = getDataSourceAdapter({ provider: connection.provider, config });
    const result = await adapter.query(spec);
    return result;
  } catch (err) {
    console.warn(`[data-sources] query failed for connection ${connection.id}`, err instanceof Error ? err.message : err);
    return null;
  }
}

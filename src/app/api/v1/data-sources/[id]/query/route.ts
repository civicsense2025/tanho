import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { getConnection } from "@/modules/data-sources/queries";
import { openConnectionConfig } from "@/modules/data-sources/crypto";
import { allowDataSourceQuery } from "@/modules/data-sources/rate-limit";
import { dataSourceBindingSchema } from "@/modules/data-sources/validation";
import { getDataSourceAdapter } from "@/adapters/data-source";
import type { QuerySpec } from "@/adapters/types";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

const SAFE_QUERY_ERROR = "Query failed. Check the table, columns, and that they're on this connection's allowlist.";

/**
 * POST /api/v1/data-sources/:id/query — run a preview query against a
 * connection, for the query-binding builder. Owner-only, rate-limited on the
 * per-connection query limiter (same one the render-time resolver uses).
 *
 * Body: a `dataSourceBinding` (table/columns/filters/sort/limit) — the same
 * shape a block stores. The `:id` path is authoritative for the connection, so
 * the body's `connectionId` is overridden with it.
 *
 * SECURITY: this re-checks the owner-defined allowlist exactly like
 * `resolveGenericData` (blocks/generic-data-resolve.ts) — the requested table
 * must be allowlisted, and columns/filters/sorts are filtered to the allowlisted
 * set before the query runs. The client's binding is NOT trusted; the stored
 * allowlist is the security boundary. Kept in lockstep with that resolver.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    await requireApiUser("owner");
    const { id } = await params;

    const body = await parseBody<Record<string, unknown>>(req);
    if (body === null) return fail("Invalid JSON body", 400);
    // Path is authoritative for the connection id.
    const parsed = dataSourceBindingSchema.safeParse({ ...body, connectionId: id });
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid query", 400);
    }
    const binding = parsed.data;

    if (!(await allowDataSourceQuery(id))) {
      return fail("Too many queries. Try again in a minute.", 429);
    }

    const connection = await getConnection(id);
    if (!connection) return fail("Connection not found", 404);

    const config = openConnectionConfig(connection.configEncrypted);
    if (!config) {
      console.error("[data-sources] query: could not open sealed config", id);
      return fail(SAFE_QUERY_ERROR, 502);
    }

    // Re-enforce the allowlist (identical to resolveGenericData): the table must
    // be allowlisted, and only allowlisted columns/filters/sorts survive.
    const allowedTable = connection.allowlistJson.find((entry) => entry.table === binding.table);
    if (!allowedTable) {
      return fail(`Table "${binding.table}" is not on this connection's allowlist.`, 400);
    }
    const allowed = new Set(allowedTable.columns);
    const columns = binding.columns.filter((c) => allowed.has(c));
    if (columns.length === 0) {
      return fail("None of the requested columns are allowlisted for this table.", 400);
    }

    const spec: QuerySpec = {
      table: binding.table,
      columns,
      filters: binding.filters?.filter((f) => allowed.has(f.column)),
      sort: binding.sort?.filter((s) => allowed.has(s.column)),
      limit: binding.limit,
    };

    try {
      const adapter = getDataSourceAdapter({ provider: connection.provider, config });
      const result = await adapter.query(spec);
      // Return the actually-queried column list (post-allowlist-filter), not the
      // raw binding, so the client renders exactly what came back.
      return ok({ columns, rows: result.rows, truncated: result.truncated });
    } catch (err) {
      console.error("[data-sources] preview query failed", err instanceof Error ? err.message : "unknown");
      return fail(SAFE_QUERY_ERROR, 502);
    }
  });
}

import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { getConnection } from "@/modules/data-sources/queries";
import { openConnectionConfig } from "@/modules/data-sources/crypto";
import { allowDataSourceMutation } from "@/modules/data-sources/rate-limit";
import { getDataSourceAdapter } from "@/adapters/data-source";
import { handle, ok, fail } from "@/lib/api/v1";

const SAFE_CONN_ERROR = "Connection failed. Check the host, credentials, and network access.";

/**
 * GET /api/v1/data-sources/:id/tables — introspect the connection's available
 * tables/columns, for building the allowlist. Owner-only, rate-limited. Purely
 * informational: returning a table here grants NO access — only what's saved
 * into the allowlist (via PATCH) is ever consulted at query time. Mirrors
 * `suggestAllowlist` in connection-actions.ts. Driver errors are redacted.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    if (!(await allowDataSourceMutation(user.id))) {
      return fail("Too many attempts. Try again in a minute.", 429);
    }
    const { id } = await params;
    const row = await getConnection(id);
    if (!row) return fail("Connection not found", 404);

    const config = openConnectionConfig(row.configEncrypted);
    if (!config) {
      console.error("[data-sources] tables: could not open sealed config", id);
      return fail(SAFE_CONN_ERROR, 502);
    }

    try {
      const adapter = getDataSourceAdapter({ provider: row.provider, config });
      const tables = await adapter.listTables();
      return ok({ tables });
    } catch (err) {
      console.error("[data-sources] listTables failed", err instanceof Error ? err.message : "unknown");
      return fail(SAFE_CONN_ERROR, 502);
    }
  });
}

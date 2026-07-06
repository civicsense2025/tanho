import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { getConnection } from "@/modules/data-sources/queries";
import { openConnectionConfig } from "@/modules/data-sources/crypto";
import { allowDataSourceMutation } from "@/modules/data-sources/rate-limit";
import { dataSourceConnections } from "@/modules/data-sources/schema";
import { getDataSourceAdapter } from "@/adapters/data-source";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { handle, ok, fail } from "@/lib/api/v1";

/** Generic, non-leaking failure message — a raw driver error can contain the
 *  host, user, or connection-string fragments, so it is logged server-side
 *  only and never returned. Mirrors `redactedFailure` in connection-actions.ts. */
const SAFE_CONN_ERROR = "Connection failed. Check the host, credentials, and network access.";

/**
 * POST /api/v1/data-sources/:id/test — verify the connection actually connects.
 * Owner-only, rate-limited. Updates `status` (connected/error) but NEVER leaks
 * driver error detail. Mirrors `testConnection` in connection-actions.ts.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
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
      console.error("[data-sources] test: could not open sealed config", id);
      return fail(SAFE_CONN_ERROR, 502);
    }

    try {
      const adapter = getDataSourceAdapter({ provider: row.provider, config });
      const result = await adapter.testConnection();
      await db
        .update(dataSourceConnections)
        .set({ status: result.ok ? "connected" : "error", updatedAt: Date.now() })
        .where(eq(dataSourceConnections.id, id));
      await writeAudit({ userId: user.id, action: "data_source.test", ownerType: "data_source", ownerId: id, meta: { ok: result.ok } });
      if (!result.ok) return fail(SAFE_CONN_ERROR, 502);
      return ok({ status: "connected" });
    } catch (err) {
      console.error("[data-sources] testConnection failed", err instanceof Error ? err.message : "unknown");
      await db
        .update(dataSourceConnections)
        .set({ status: "error", updatedAt: Date.now() })
        .where(eq(dataSourceConnections.id, id));
      return fail(SAFE_CONN_ERROR, 502);
    }
  });
}

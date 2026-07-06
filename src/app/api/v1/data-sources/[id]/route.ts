import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { getConnection, getConnectionSummary } from "@/modules/data-sources/queries";
import { sealConnectionConfig } from "@/modules/data-sources/crypto";
import { allowDataSourceMutation } from "@/modules/data-sources/rate-limit";
import { dataSourceConnections } from "@/modules/data-sources/schema";
import { updateConnectionSchema } from "@/modules/data-sources/validation.server";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/**
 * GET /api/v1/data-sources/:id — one connection, credential-free summary
 * (never the sealed config). Owner-only.
 * PATCH /api/v1/data-sources/:id — update name/config/allowlist. Owner-only,
 * rate-limited. A new config is re-parsed through the server SSRF schema and
 * re-sealed; the allowlist is the security boundary consulted at query time.
 * DELETE /api/v1/data-sources/:id — delete. Owner-only. Bound blocks fail closed.
 * Mirrors updateConnection/deleteConnection in connection-actions.ts.
 *
 * NOTE: PATCH's body carries the id in the path, so the body's `id` (required by
 * updateConnectionSchema) is set from the path param before parsing.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    await requireApiUser("owner");
    const { id } = await params;
    const summary = await getConnectionSummary(id);
    if (!summary) return fail("Connection not found", 404);
    return ok(summary);
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    if (!(await allowDataSourceMutation(user.id))) {
      return fail("Too many attempts. Try again in a minute.", 429);
    }
    const { id } = await params;
    const body = await parseBody<Record<string, unknown>>(req);
    if (body === null) return fail("Invalid JSON body", 400);
    // The path is authoritative for the id; ignore any body id.
    const parsed = await updateConnectionSchema.safeParseAsync({ ...body, id });
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid connection", 400);
    }
    const existing = await getConnection(id);
    if (!existing) return fail("Connection not found", 404);
    await db
      .update(dataSourceConnections)
      .set({
        name: parsed.data.name ?? existing.name,
        ...(parsed.data.config
          ? { provider: parsed.data.config.provider, configEncrypted: sealConnectionConfig(parsed.data.config) }
          : {}),
        ...(parsed.data.allowlist ? { allowlistJson: parsed.data.allowlist } : {}),
        updatedAt: Date.now(),
      })
      .where(eq(dataSourceConnections.id, id));
    revalidateTag("data-sources", "max");
    revalidateTag(`data-source:${id}`, "max");
    await writeAudit({ userId: user.id, action: "data_source.update", ownerType: "data_source", ownerId: id });
    return ok({ id });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    const { id } = await params;
    await db.delete(dataSourceConnections).where(eq(dataSourceConnections.id, id));
    revalidateTag("data-sources", "max");
    revalidateTag(`data-source:${id}`, "max");
    await writeAudit({ userId: user.id, action: "data_source.delete", ownerType: "data_source", ownerId: id });
    return ok();
  });
}

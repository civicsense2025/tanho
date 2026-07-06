import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { listConnections } from "@/modules/data-sources/queries";
import { sealConnectionConfig } from "@/modules/data-sources/crypto";
import { allowDataSourceMutation } from "@/modules/data-sources/rate-limit";
import { dataSourceConnections } from "@/modules/data-sources/schema";
import { createConnectionSchema } from "@/modules/data-sources/validation.server";
import { db } from "@/lib/db/client";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/**
 * GET /api/v1/data-sources — list external DB connections. Owner-only.
 * Returns the credential-free summary projection (`listConnections` omits the
 * sealed `configEncrypted`), never the secrets.
 *
 * POST /api/v1/data-sources — create a connection. Owner-only, rate-limited.
 * Body: createConnectionSchema (name + provider config). The config is parsed
 * through the SERVER schema (validation.server.ts) so the async SSRF
 * host-blocklist + TLS checks run, then sealed via sealConnectionConfig before
 * storage. Mirrors `createConnection` in modules/data-sources/connection-actions.ts.
 */
export async function GET(): Promise<Response> {
  return handle(async () => {
    await requireApiUser("owner");
    return ok(await listConnections());
  });
}

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    if (!(await allowDataSourceMutation(user.id))) {
      return fail("Too many attempts. Try again in a minute.", 429);
    }
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = await createConnectionSchema.safeParseAsync(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid connection", 400);
    }
    const [row] = await db
      .insert(dataSourceConnections)
      .values({
        name: parsed.data.name,
        provider: parsed.data.config.provider,
        configEncrypted: sealConnectionConfig(parsed.data.config),
        allowlistJson: [],
        status: "unverified",
        createdBy: user.id,
      })
      .returning({ id: dataSourceConnections.id });
    revalidateTag("data-sources", "max");
    await writeAudit({ userId: user.id, action: "data_source.create", ownerType: "data_source", ownerId: row!.id });
    return ok({ id: row!.id }, 201);
  });
}

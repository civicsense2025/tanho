import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { readSettingRow } from "@/modules/settings/queries";
import { settings } from "@/modules/settings/schema";
import { settingsSchemas } from "@/modules/settings/validation";
import { db } from "@/lib/db/client";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/**
 * GET /api/v1/settings/:namespace — read one settings namespace (raw JSON).
 * PATCH /api/v1/settings/:namespace — write one settings namespace. Owner-only;
 * body must parse against the namespace's zod schema in settingsSchemas.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ namespace: string }> }): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const { namespace } = await params;
    return ok(await readSettingRow(namespace));
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ namespace: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    const { namespace } = await params;
    const schema = settingsSchemas[namespace];
    if (!schema) return fail(`Unknown settings namespace: ${namespace}`, 404);
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid settings", 400);
    }
    await db
      .insert(settings)
      .values({ namespace, data: parsed.data, updatedAt: Date.now() })
      .onConflictDoUpdate({
        target: settings.namespace,
        set: { data: parsed.data, updatedAt: Date.now() },
      });
    revalidateTag(`settings:${namespace}`, "max");
    await writeAudit({ userId: user.id, action: "settings.save", ownerType: "settings", ownerId: namespace });
    return ok();
  });
}

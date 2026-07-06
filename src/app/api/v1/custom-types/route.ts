import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { listCustomTypes } from "@/modules/custom-types/queries";
import { customTypes } from "@/modules/custom-types/schema";
import { customTypeInputSchema } from "@/modules/custom-types/validation";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/**
 * GET /api/v1/custom-types — list all custom content types (name-sorted).
 * Editor+.
 * POST /api/v1/custom-types — create. Body: customTypeInputSchema. Owner-only;
 * slug must be unique. Mirrors the insert half of `saveCustomType` in
 * modules/custom-types/actions.ts (inlined here rather than calling the action,
 * which uses `requireUser` and returns action-state, not an HTTP response).
 */
export async function GET(): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    return ok(await listCustomTypes());
  });
}

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = customTypeInputSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid content type", 400);
    }
    const input = parsed.data;
    const clash = await db.query.customTypes.findFirst({
      where: eq(customTypes.slug, input.slug),
      columns: { id: true },
    });
    if (clash) return fail(`Slug "${input.slug}" is already in use`, 409);
    const [row] = await db
      .insert(customTypes)
      .values({ ...input, updatedAt: Date.now() })
      .returning({ id: customTypes.id });
    revalidateTag("custom_types", "max");
    await writeAudit({ userId: user.id, action: "custom_type.create", ownerType: "custom_type", ownerId: row.id });
    return ok({ id: row.id }, 201);
  });
}

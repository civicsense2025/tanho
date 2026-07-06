import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { customTypes } from "@/modules/custom-types/schema";
import { customTypeInputSchema } from "@/modules/custom-types/validation";
import { entries } from "@/modules/entries/schema";
import { db } from "@/lib/db/client";
import { and, count, eq, ne } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/**
 * GET /api/v1/custom-types/:id — one custom type (admin editor load). Editor+.
 * PATCH /api/v1/custom-types/:id — update. Body: customTypeInputSchema.
 * Owner-only; slug must stay unique across other types.
 * DELETE /api/v1/custom-types/:id — delete. Owner-only.
 * Mirrors `saveCustomType` / `deleteCustomType` in modules/custom-types/actions.ts
 * (inlined here rather than calling the actions, which use `requireUser` and
 * return action-state, not HTTP responses). There is no get-by-id query in
 * modules/custom-types/queries.ts, so the row is fetched from the table directly.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const { id } = await params;
    const row = await db.query.customTypes.findFirst({ where: eq(customTypes.id, id) });
    if (!row) return fail("Content type not found", 404);
    return ok(row);
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    const { id } = await params;
    const existing = await db.query.customTypes.findFirst({ where: eq(customTypes.id, id) });
    if (!existing) return fail("Content type not found", 404);
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = customTypeInputSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid content type", 400);
    }
    const input = parsed.data;
    const clash = await db.query.customTypes.findFirst({
      where: and(eq(customTypes.slug, input.slug), ne(customTypes.id, id)),
      columns: { id: true },
    });
    if (clash) return fail(`Slug "${input.slug}" is already in use`, 409);
    await db.update(customTypes).set({ ...input, updatedAt: Date.now() }).where(eq(customTypes.id, id));
    revalidateTag("custom_types", "max");
    await writeAudit({ userId: user.id, action: "custom_type.update", ownerType: "custom_type", ownerId: id });
    return ok({ id });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    const { id } = await params;
    const existing = await db.query.customTypes.findFirst({ where: eq(customTypes.id, id) });
    if (!existing) return fail("Content type not found", 404);
    // Refuse while any entries of type `custom:<slug>` still exist, so live
    // content is never orphaned — mirrors deleteCustomType in actions.ts.
    const [{ n }] = await db
      .select({ n: count() })
      .from(entries)
      .where(eq(entries.type, `custom:${existing.slug}`));
    if (n > 0) {
      return fail(`Cannot delete: ${n} entr${n === 1 ? "y" : "ies"} still use this type`, 409);
    }
    await db.delete(customTypes).where(eq(customTypes.id, id));
    revalidateTag("custom_types", "max");
    await writeAudit({ userId: user.id, action: "custom_type.delete", ownerType: "custom_type", ownerId: id });
    return ok();
  });
}

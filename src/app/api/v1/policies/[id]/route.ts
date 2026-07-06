import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { getPolicy } from "@/modules/policies/queries";
import { policies } from "@/modules/policies/schema";
import { policyInputSchema } from "@/modules/policies/validation";
import { db } from "@/lib/db/client";
import { and, eq, ne } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/**
 * GET /api/v1/policies/:id — one policy document (admin editor load). Editor+.
 * PATCH /api/v1/policies/:id — update. Body: policyInputSchema. Owner-only;
 * slug must stay unique across other policies.
 * DELETE /api/v1/policies/:id — delete. Owner-only.
 * Mirrors `savePolicy(id, …)` / `deletePolicy` in modules/policies/actions.ts.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const { id } = await params;
    const row = await getPolicy(id);
    if (!row) return fail("Policy not found", 404);
    return ok(row);
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    const { id } = await params;
    const existing = await getPolicy(id);
    if (!existing) return fail("Policy not found", 404);
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = policyInputSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid policy", 400);
    }
    const input = parsed.data;
    const clash = await db.query.policies.findFirst({
      where: and(eq(policies.slug, input.slug), ne(policies.id, id)),
      columns: { id: true },
    });
    if (clash) return fail(`Slug "${input.slug}" is already in use`, 409);
    await db.update(policies).set({ ...input, updatedAt: Date.now() }).where(eq(policies.id, id));
    revalidateTag("policies", "max");
    revalidateTag(`policy:${input.slug}`, "max");
    if (existing.slug !== input.slug) revalidateTag(`policy:${existing.slug}`, "max");
    await writeAudit({ userId: user.id, action: "policy.update", ownerType: "policy", ownerId: id });
    return ok({ id });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    const { id } = await params;
    const existing = await getPolicy(id);
    await db.delete(policies).where(eq(policies.id, id));
    revalidateTag("policies", "max");
    if (existing?.slug) revalidateTag(`policy:${existing.slug}`, "max");
    await writeAudit({ userId: user.id, action: "policy.delete", ownerType: "policy", ownerId: id });
    return ok();
  });
}

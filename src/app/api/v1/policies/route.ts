import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { listPolicies } from "@/modules/policies/queries";
import { policies } from "@/modules/policies/schema";
import { policyInputSchema } from "@/modules/policies/validation";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/**
 * GET /api/v1/policies — list all policy documents (admin order: group, title).
 * Editor+.
 * POST /api/v1/policies — create. Body: policyInputSchema. Owner-only; slug
 * must be unique. Mirrors `savePolicy(null, …)` in modules/policies/actions.ts.
 */
export async function GET(): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    return ok(await listPolicies());
  });
}

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = policyInputSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid policy", 400);
    }
    const input = parsed.data;
    const clash = await db.query.policies.findFirst({
      where: eq(policies.slug, input.slug),
      columns: { id: true },
    });
    if (clash) return fail(`Slug "${input.slug}" is already in use`, 409);
    const [row] = await db
      .insert(policies)
      .values({ ...input, updatedAt: Date.now() })
      .returning({ id: policies.id });
    revalidateTag("policies", "max");
    revalidateTag(`policy:${input.slug}`, "max");
    await writeAudit({ userId: user.id, action: "policy.create", ownerType: "policy", ownerId: row.id });
    return ok({ id: row.id }, 201);
  });
}

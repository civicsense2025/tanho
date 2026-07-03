"use server";

import { updateTag } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { policies } from "./schema";
import { policyInputSchema } from "./validation";

export type PolicyActionState = { ok?: boolean; error?: string; id?: string };

/** Create or update a policy document. Owner-only; zod-validated; slug unique. */
export async function savePolicy(
  id: string | null,
  data: unknown,
): Promise<PolicyActionState> {
  const user = await requireUser("owner");

  const parsed = policyInputSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid policy" };
  }
  const input = parsed.data;

  // Reject a slug already used by a different policy.
  const clash = await db.query.policies.findFirst({
    where: id
      ? and(eq(policies.slug, input.slug), ne(policies.id, id))
      : eq(policies.slug, input.slug),
    columns: { id: true },
  });
  if (clash) return { error: `Slug "${input.slug}" is already in use` };

  let savedId = id ?? "";
  if (id) {
    await db
      .update(policies)
      .set({ ...input, updatedAt: Date.now() })
      .where(eq(policies.id, id));
  } else {
    const [row] = await db
      .insert(policies)
      .values({ ...input, updatedAt: Date.now() })
      .returning({ id: policies.id });
    savedId = row?.id ?? "";
  }

  updateTag("policies");
  updateTag(`policy:${input.slug}`);
  await writeAudit({
    userId: user.id,
    action: id ? "policy.update" : "policy.create",
    ownerType: "policy",
    ownerId: savedId,
  });
  return { ok: true, id: savedId };
}

/** Delete a policy. Owner-only. */
export async function deletePolicy(id: string): Promise<PolicyActionState> {
  const user = await requireUser("owner");
  const row = await db.query.policies.findFirst({
    where: eq(policies.id, id),
    columns: { slug: true },
  });
  await db.delete(policies).where(eq(policies.id, id));
  updateTag("policies");
  if (row?.slug) updateTag(`policy:${row.slug}`);
  await writeAudit({
    userId: user.id,
    action: "policy.delete",
    ownerType: "policy",
    ownerId: id,
  });
  return { ok: true };
}

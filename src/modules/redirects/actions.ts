"use server";

import { updateTag } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { redirects } from "./schema";
import { redirectInputSchema } from "./validation";

export type RedirectActionState = { ok?: boolean; error?: string; id?: string };

/** Create or update a redirect. Owner-only; zod-validated (same-origin); unique fromPath. */
export async function saveRedirect(
  id: string | null,
  data: unknown,
): Promise<RedirectActionState> {
  const user = await requireUser("owner");

  const parsed = redirectInputSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid redirect" };
  }
  const input = parsed.data;

  const clash = await db.query.redirects.findFirst({
    where: id
      ? and(eq(redirects.fromPath, input.fromPath), ne(redirects.id, id))
      : eq(redirects.fromPath, input.fromPath),
    columns: { id: true },
  });
  if (clash) return { error: `A redirect from "${input.fromPath}" already exists` };

  let savedId = id ?? "";
  if (id) {
    await db.update(redirects).set(input).where(eq(redirects.id, id));
  } else {
    const [row] = await db
      .insert(redirects)
      .values(input)
      .returning({ id: redirects.id });
    savedId = row?.id ?? "";
  }

  updateTag("redirects");
  await writeAudit({
    userId: user.id,
    action: id ? "redirect.update" : "redirect.create",
    ownerType: "redirect",
    ownerId: savedId,
  });
  return { ok: true, id: savedId };
}

/** Delete a redirect. Owner-only. */
export async function deleteRedirect(id: string): Promise<RedirectActionState> {
  const user = await requireUser("owner");
  await db.delete(redirects).where(eq(redirects.id, id));
  updateTag("redirects");
  await writeAudit({
    userId: user.id,
    action: "redirect.delete",
    ownerType: "redirect",
    ownerId: id,
  });
  return { ok: true };
}

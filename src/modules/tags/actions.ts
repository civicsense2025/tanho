"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { tags, taggings } from "./schema";
import { createTagSchema, renameTagSchema } from "./validation";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/** Create a tag. Owner-only; names are unique (case-sensitive after trim). */
export async function createTag(input: unknown): Promise<Result<{ id: string }>> {
  const user = await requireUser("owner");
  const parsed = createTagSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid tag" };
  }
  const existing = await db.query.tags.findFirst({ where: eq(tags.name, parsed.data.name) });
  if (existing) return { ok: false, error: "A tag with that name already exists" };

  const [row] = await db.insert(tags).values({ name: parsed.data.name }).returning();
  await writeAudit({ userId: user.id, action: "tag.create", ownerType: "tag", ownerId: row.id });
  return { ok: true, data: { id: row.id } };
}

/** Rename a tag. Owner-only; the new name must not collide. */
export async function renameTag(input: unknown): Promise<Result> {
  const user = await requireUser("owner");
  const parsed = renameTagSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid tag" };
  }
  const { id, name } = parsed.data;
  const clash = await db.query.tags.findFirst({ where: eq(tags.name, name) });
  if (clash && clash.id !== id) return { ok: false, error: "A tag with that name already exists" };

  await db.update(tags).set({ name }).where(eq(tags.id, id));
  await writeAudit({ userId: user.id, action: "tag.rename", ownerType: "tag", ownerId: id });
  return { ok: true };
}

/** Delete a tag and cascade its assignments. Owner-only. */
export async function deleteTag(id: string): Promise<Result> {
  const user = await requireUser("owner");
  if (!id) return { ok: false, error: "Missing tag id" };
  await db.delete(taggings).where(eq(taggings.tagId, id));
  await db.delete(tags).where(eq(tags.id, id));
  await writeAudit({ userId: user.id, action: "tag.delete", ownerType: "tag", ownerId: id });
  return { ok: true };
}

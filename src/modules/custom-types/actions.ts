"use server";

import { updateTag } from "next/cache";
import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { entries } from "@/modules/entries/schema";
import { customTypes } from "./schema";
import { customTypeInputSchema } from "./validation";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/**
 * Create or update a custom type (upsert by slug). Owner-only; the payload
 * is validated through the meta-schema (which rejects prototype-pollution
 * field keys and caps field count/depth) before it touches the DB.
 */
export async function saveCustomType(input: unknown): Promise<Result<{ id: string }>> {
  const user = await requireUser("owner");
  const parsed = customTypeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid content type" };
  }
  const { slug, name, fields, enabled } = parsed.data;

  const [row] = await db
    .insert(customTypes)
    .values({ slug, name, fields, enabled, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: customTypes.slug,
      set: { name, fields, enabled, updatedAt: Date.now() },
    })
    .returning();

  updateTag("custom_types");
  await writeAudit({
    userId: user.id,
    action: "custom_type.save",
    ownerType: "custom_type",
    ownerId: row.id,
  });
  return { ok: true, data: { id: row.id } };
}

/**
 * Delete a custom type. Refuses while any entries of type `custom:<slug>`
 * still exist, so live content is never orphaned. Owner-only.
 */
export async function deleteCustomType(id: string): Promise<Result> {
  const user = await requireUser("owner");
  const existing = await db.query.customTypes.findFirst({ where: eq(customTypes.id, id) });
  if (!existing) return { ok: false, error: "Content type not found" };

  const [{ n }] = await db
    .select({ n: count() })
    .from(entries)
    .where(eq(entries.type, `custom:${existing.slug}`));
  if (n > 0) {
    return { ok: false, error: `Cannot delete: ${n} entr${n === 1 ? "y" : "ies"} still use this type` };
  }

  await db.delete(customTypes).where(eq(customTypes.id, id));
  updateTag("custom_types");
  await writeAudit({
    userId: user.id,
    action: "custom_type.delete",
    ownerType: "custom_type",
    ownerId: id,
  });
  return { ok: true };
}

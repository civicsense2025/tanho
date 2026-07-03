"use server";

import { updateTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { rebuildMediaUsage } from "@/modules/media/usage";
import { blockSets } from "@/modules/pages/schema";
import { validateBlockTree } from "@/modules/pages/blocks-io";
import { getEntitySchema } from "@/entities/registry-async";
import { entries } from "./schema";
import { entryDetailsSchema } from "./validation";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const invalidate = (type: string) => {
  updateTag("entries");
  updateTag(`entries:${type}`);
};

/** Validates the entry's `data` JSON against its registered entity schema. */
async function validateData(
  type: string,
  data: unknown,
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  const schema = await getEntitySchema(type);
  if (!schema) return { ok: false, error: `Unknown content type: ${type}` };
  const parsed = schema.dataSchema.safeParse(data ?? {});
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid content" };
  }
  return { ok: true, data: parsed.data as Record<string, unknown> };
}

export async function createEntry(input: unknown): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const detailsRaw = entryDetailsSchema.safeParse(input);
  if (!detailsRaw.success) {
    return { ok: false, error: detailsRaw.error.issues[0]?.message ?? "Invalid entry" };
  }
  const details = detailsRaw.data;
  const dataResult = await validateData(
    details.type,
    (input as { data?: unknown })?.data,
  );
  if (!dataResult.ok) return dataResult;

  const dupe = await db.query.entries.findFirst({
    where: and(eq(entries.type, details.type), eq(entries.slug, details.slug)),
  });
  if (dupe) return { ok: false, error: `Slug ${details.slug} is already in use` };

  const [row] = await db
    .insert(entries)
    .values({ ...details, data: dataResult.data, updatedAt: Date.now() })
    .returning({ id: entries.id });
  await writeAudit({
    userId: user.id,
    action: "entry.create",
    ownerType: `entry:${details.type}`,
    ownerId: row.id,
  });
  invalidate(details.type);
  return { ok: true, data: { id: row.id } };
}

export async function updateEntry(id: string, input: unknown): Promise<Result> {
  const user = await requireUser();
  const existing = await db.query.entries.findFirst({ where: eq(entries.id, id) });
  if (!existing) return { ok: false, error: "Entry not found" };

  const detailsRaw = entryDetailsSchema.partial().safeParse(input);
  if (!detailsRaw.success) {
    return { ok: false, error: detailsRaw.error.issues[0]?.message ?? "Invalid entry" };
  }
  const details = detailsRaw.data;

  const patch: Record<string, unknown> = { ...details, updatedAt: Date.now() };
  // `type` is immutable — an entry's data schema is fixed at creation.
  delete patch.type;

  if ("data" in (input as object)) {
    const dataResult = await validateData(existing.type, (input as { data?: unknown }).data);
    if (!dataResult.ok) return dataResult;
    patch.data = dataResult.data;
  }

  if (details.slug && details.slug !== existing.slug) {
    const dupe = await db.query.entries.findFirst({
      where: and(eq(entries.type, existing.type), eq(entries.slug, details.slug)),
    });
    if (dupe) return { ok: false, error: `Slug ${details.slug} is already in use` };
  }

  await db.update(entries).set(patch).where(eq(entries.id, id));
  await writeAudit({
    userId: user.id,
    action: "entry.update",
    ownerType: `entry:${existing.type}`,
    ownerId: id,
  });
  invalidate(existing.type);
  return { ok: true };
}

export async function deleteEntry(id: string): Promise<Result> {
  const user = await requireUser();
  const existing = await db.query.entries.findFirst({ where: eq(entries.id, id) });
  if (!existing) return { ok: true };
  await db
    .delete(blockSets)
    .where(
      and(
        eq(blockSets.ownerType, `entry:${existing.type}`),
        eq(blockSets.ownerId, id),
      ),
    );
  await db.delete(entries).where(eq(entries.id, id));
  await writeAudit({
    userId: user.id,
    action: "entry.delete",
    ownerType: `entry:${existing.type}`,
    ownerId: id,
  });
  invalidate(existing.type);
  return { ok: true };
}

/** Autosave target — writes the DRAFT block variant for an entry page. */
export async function saveEntryDraftBlocks(id: string, tree: unknown): Promise<Result> {
  const user = await requireUser();
  const existing = await db.query.entries.findFirst({ where: eq(entries.id, id) });
  if (!existing) return { ok: false, error: "Entry not found" };
  const v = validateBlockTree(tree);
  if (!v.ok) return { ok: false, error: v.error };
  const ownerType = `entry:${existing.type}`;
  await db
    .insert(blockSets)
    .values({
      ownerType,
      ownerId: id,
      variant: "draft",
      blocks: v.blocks,
      savedAt: Date.now(),
      savedBy: user.id,
    })
    .onConflictDoUpdate({
      target: [blockSets.ownerType, blockSets.ownerId, blockSets.variant],
      set: { blocks: v.blocks, savedAt: Date.now(), savedBy: user.id },
    });
  return { ok: true };
}

/** Publish an entry page: copy draft → published (mirrors pages' publish). */
export async function publishEntryBlocks(id: string): Promise<Result> {
  const user = await requireUser();
  const existing = await db.query.entries.findFirst({ where: eq(entries.id, id) });
  if (!existing) return { ok: false, error: "Entry not found" };
  const ownerType = `entry:${existing.type}`;
  const draft = await db.query.blockSets.findFirst({
    where: and(
      eq(blockSets.ownerType, ownerType),
      eq(blockSets.ownerId, id),
      eq(blockSets.variant, "draft"),
    ),
  });
  const v = validateBlockTree(draft?.blocks ?? []);
  if (!v.ok) return { ok: false, error: v.error };

  await db
    .insert(blockSets)
    .values({
      ownerType,
      ownerId: id,
      variant: "published",
      blocks: v.blocks,
      savedAt: Date.now(),
      savedBy: user.id,
    })
    .onConflictDoUpdate({
      target: [blockSets.ownerType, blockSets.ownerId, blockSets.variant],
      set: { blocks: v.blocks, savedAt: Date.now(), savedBy: user.id },
    });

  const schema = await getEntitySchema(existing.type);
  const route = `${schema?.basePath ?? ""}/${existing.slug}`;
  await rebuildMediaUsage(ownerType, id, route, v.blocks);
  await writeAudit({
    userId: user.id,
    action: "entry.publish",
    ownerType,
    ownerId: id,
  });
  invalidate(existing.type);
  return { ok: true };
}

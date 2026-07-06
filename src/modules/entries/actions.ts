"use server";

import { updateTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { rebuildMediaUsage } from "@/modules/media/usage";
import { recordSlugChange } from "@/modules/seo";
import { indexEntry, removeEntryFromIndex } from "@/modules/search/index-document";
import { entryPublicPath } from "./paths";
import { blockSets } from "@/modules/pages/schema";
import { getEntitySchema } from "@/entities/registry-async";
import { saveOwnerBlocks, publishOwnerBlocks } from "@/modules/blocks/actions";
import { getEditorChromePreview } from "@/modules/chrome/queries";
import type { BlockNode } from "@/blocks/types";
import { entries, type EntryRow } from "./schema";
import { entryDetailsSchema } from "./validation";
import { getEntryForEdit } from "./queries";

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

  const slugChanged = !!details.slug && details.slug !== existing.slug;
  if (slugChanged) {
    const dupe = await db.query.entries.findFirst({
      where: and(eq(entries.type, existing.type), eq(entries.slug, details.slug!)),
    });
    if (dupe) return { ok: false, error: `Slug ${details.slug} is already in use` };
  }

  await db.update(entries).set(patch).where(eq(entries.id, id));

  // A published entry whose slug changed keeps its old URL working via a 301.
  // Paths are built from the shared entryPublicPath (same builder the sitemap
  // uses), so a type with no per-item page (e.g. resource) simply skips this.
  if (slugChanged && existing.status === "published") {
    const newData = (patch.data ?? existing.data ?? {}) as Record<string, unknown>;
    const oldPath = entryPublicPath(existing.type, existing.slug, (existing.data ?? {}) as Record<string, unknown>);
    const newPath = entryPublicPath(existing.type, details.slug!, newData);
    if (oldPath && newPath && oldPath !== newPath) {
      await recordSlugChange("entry", id, oldPath, newPath);
      updateTag("redirects");
    }
  }

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
  await removeEntryFromIndex(id);
  await writeAudit({
    userId: user.id,
    action: "entry.delete",
    ownerType: `entry:${existing.type}`,
    ownerId: id,
  });
  invalidate(existing.type);
  return { ok: true };
}

/**
 * Content-editor load, callable from the client — `getEntryForEdit` lives in
 * the plain (non-"use server") queries module, so the admin entry panel
 * (which opens the block canvas without a page navigation) needs this thin
 * auth-checked wrapper to fetch it on demand.
 */
export async function loadEntryForContentEdit(
  id: string,
): Promise<
  Result<{
    entry: EntryRow;
    blocks: BlockNode[];
    publishedBlocks: BlockNode[];
    headerBlocks: BlockNode[];
    footerBlocks: BlockNode[];
  }>
> {
  await requireUser();
  const [hit, chrome] = await Promise.all([getEntryForEdit(id), getEditorChromePreview()]);
  if (!hit) return { ok: false, error: "Entry not found" };
  // Ship the resolved chrome trees too so the entry canvas previews the real
  // site header/footer, same as the page builder.
  return { ok: true, data: { ...hit, ...chrome } };
}

/** Autosave target — writes the DRAFT block variant for an entry page. */
export async function saveEntryDraftBlocks(id: string, tree: unknown): Promise<Result> {
  const existing = await db.query.entries.findFirst({ where: eq(entries.id, id) });
  if (!existing) return { ok: false, error: "Entry not found" };
  return saveOwnerBlocks(`entry:${existing.type}`, id, tree);
}

/** Publish an entry page: copy draft → published (mirrors pages' publish). */
export async function publishEntryBlocks(id: string): Promise<Result> {
  const user = await requireUser();
  const existing = await db.query.entries.findFirst({ where: eq(entries.id, id) });
  if (!existing) return { ok: false, error: "Entry not found" };
  const ownerType = `entry:${existing.type}`;
  const published = await publishOwnerBlocks(ownerType, id);
  if (!published.ok) return published;

  const schema = await getEntitySchema(existing.type);
  const route = `${schema?.basePath ?? ""}/${existing.slug}`;
  await rebuildMediaUsage(ownerType, id, route, published.blocks);
  await indexEntry({ id, entryType: existing.type, slug: existing.slug, title: existing.title, blocks: published.blocks });
  await writeAudit({
    userId: user.id,
    action: "entry.publish",
    ownerType,
    ownerId: id,
  });
  invalidate(existing.type);
  return { ok: true };
}

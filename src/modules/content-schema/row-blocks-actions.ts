"use server";

import { updateTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import type { BlockNode } from "@/blocks/types";
import { blockSets } from "@/modules/pages/schema";
import { customTypes } from "@/modules/custom-types/schema";
import { saveOwnerBlocks, publishOwnerBlocks } from "@/modules/blocks/actions";
import { rowBlocksOwner } from "@/modules/content-pages/template-owners";

/**
 * Save/publish ONE custom-type row's OWN block tree (its bespoke detail layout)
 * — stored in `block_sets` under owner `entry:custom:<slug>` with ownerId = the
 * row's id (the exact key the public renderer reads via
 * content-pages/queries.ts `getPublishedRowBlocks`). Mirrors template-actions.ts
 * but keyed per row rather than per type: wraps the generic saveOwnerBlocks/
 * publishOwnerBlocks and, on publish, busts the same cache tags the renderer's
 * `getPublishedRowBlocks` is keyed on. Owner-only.
 */
type Result = { ok: true } | { ok: false; error: string };

/** Resolve the type's slug from its id (the owner key is slug-based). */
async function slugOf(typeId: string): Promise<string | null> {
  const row = await db.query.customTypes.findFirst({ where: eq(customTypes.id, typeId) });
  return row?.tableName ? row.slug : null;
}

/** Autosave the DRAFT row tree. */
export async function saveDraftRowBlocks(
  typeId: string,
  rowId: string,
  tree: unknown,
): Promise<Result> {
  const slug = await slugOf(typeId);
  if (!slug) return { ok: false, error: "Content type not found or not table-backed" };
  return saveOwnerBlocks(rowBlocksOwner(slug), rowId, tree);
}

/** Publish the DRAFT row tree → live, and bust the renderer's cache tags. */
export async function publishRowBlocks(typeId: string, rowId: string): Promise<Result> {
  const user = await requireUser("owner");
  const slug = await slugOf(typeId);
  if (!slug) return { ok: false, error: "Content type not found or not table-backed" };
  const res = await publishOwnerBlocks(rowBlocksOwner(slug), rowId);
  if (!res.ok) return res;
  updateTag("custom_types");
  updateTag(`entry:custom:${slug}:${rowId}`);
  await writeAudit({
    userId: user.id,
    action: "content_row.design.publish",
    ownerType: "custom_type",
    ownerId: typeId,
  });
  return { ok: true };
}

/**
 * Load a row's draft + published trees for the editor (uncached — admin is
 * dynamic). Returns the draft to edit and whether it differs from published.
 */
export async function loadRowBlocksForEdit(
  typeId: string,
  rowId: string,
): Promise<
  | { ok: true; slug: string; blocks: BlockNode[]; draftDiffers: boolean }
  | { ok: false; error: string }
> {
  await requireUser("owner");
  const slug = await slugOf(typeId);
  if (!slug) return { ok: false, error: "Content type not found or not table-backed" };
  const owner = rowBlocksOwner(slug);
  const sets = await db.query.blockSets.findMany({
    where: and(eq(blockSets.ownerType, owner), eq(blockSets.ownerId, rowId)),
  });
  const draft = sets.find((s) => s.variant === "draft");
  const published = sets.find((s) => s.variant === "published");
  const blocks = (draft?.blocks ?? published?.blocks ?? []) as BlockNode[];
  const draftDiffers = JSON.stringify(draft?.blocks ?? []) !== JSON.stringify(published?.blocks ?? []);
  return { ok: true, slug, blocks, draftDiffers };
}

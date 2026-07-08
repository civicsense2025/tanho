"use server";

import { updateTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import type { BlockNode } from "@/blocks/types";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { blockSets } from "@/modules/pages/schema";
import { validateBlockTree } from "@/modules/pages/blocks-io";
import { blockRegistry } from "./schema";
import { ensureBlockRegistrySeeded } from "./registry-queries";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Generic autosave target — writes the DRAFT block_sets row for any
 * (ownerType, ownerId). Backs `saveDraftBlocks` (owner "page") and
 * `saveEntryDraftBlocks` (owner "entry:<type>"); callers keep their own
 * `requireUser` + owner-lookup, this just does the validate + upsert.
 */
export async function saveOwnerBlocks(ownerType: string, ownerId: string, tree: unknown): Promise<Result> {
  const user = await requireUser();
  const v = validateBlockTree(tree);
  if (!v.ok) return { ok: false, error: v.error };
  await db
    .insert(blockSets)
    .values({
      ownerType,
      ownerId,
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

/**
 * Generic publish — copies DRAFT → PUBLISHED in block_sets for any
 * (ownerType, ownerId), and returns the validated published tree. Does ONLY
 * the block_sets copy: no status flips, no paywall recompute, no media-usage
 * rebuild. Owner-specific publish functions (`publishPage`, `publishEntryBlocks`,
 * `publishProductBlocks`, `publishCollectionBlocks`) call this as their first
 * step, then run their own post-steps on the returned `blocks` (rebuildMediaUsage,
 * status flips, paywall recompute, audit, cache invalidation).
 */
export async function publishOwnerBlocks(
  ownerType: string,
  ownerId: string,
): Promise<{ ok: true; blocks: BlockNode[] } | { ok: false; error: string }> {
  const user = await requireUser();
  const draft = await db.query.blockSets.findFirst({
    where: and(
      eq(blockSets.ownerType, ownerType),
      eq(blockSets.ownerId, ownerId),
      eq(blockSets.variant, "draft"),
    ),
  });
  const v = validateBlockTree(draft?.blocks ?? []);
  if (!v.ok) return { ok: false, error: v.error };
  await db
    .insert(blockSets)
    .values({
      ownerType,
      ownerId,
      variant: "published",
      blocks: v.blocks,
      savedAt: Date.now(),
      savedBy: user.id,
    })
    .onConflictDoUpdate({
      target: [blockSets.ownerType, blockSets.ownerId, blockSets.variant],
      set: { blocks: v.blocks, savedAt: Date.now(), savedBy: user.id },
    });
  return { ok: true, blocks: v.blocks };
}

/**
 * Toggle a block type's `enabled` flag. Owner-only. Built-in blocks may be
 * disabled (hidden from the picker) but never deleted. Revalidates the
 * "block-registry" cache tag so the picker reflects the change on next read.
 */
export async function toggleBlockEnabled(type: string, enabled: boolean): Promise<Result> {
  const user = await requireUser("owner");
  const existing = await db.query.blockRegistry.findFirst({ where: eq(blockRegistry.type, type) });
  if (!existing) return { ok: false, error: "Block type not found" };
  await db
    .update(blockRegistry)
    .set({ enabled, updatedAt: Date.now() })
    .where(eq(blockRegistry.type, type));
  updateTag("block-registry");
  await writeAudit({
    userId: user.id,
    action: "block.registry.toggle",
    ownerType: "block_registry",
    ownerId: type,
    meta: { enabled },
  });
  return { ok: true };
}

/**
 * Re-sync registry metadata from the compiled block defs — picks up label/icon
 * blurb changes after a platform update, and inserts rows for any newly added
 * compiled block types. Preserves `enabled` on existing rows. Owner-only.
 */
export async function refreshBlockRegistry(): Promise<Result> {
  const user = await requireUser("owner");
  // Reset the once-per-process guard so a manual refresh re-runs the upsert.
  await ensureBlockRegistrySeeded();
  updateTag("block-registry");
  await writeAudit({
    userId: user.id,
    action: "block.registry.refresh",
    ownerType: "block_registry",
    ownerId: "registry",
  });
  return { ok: true };
}

"use server";

import { updateTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { blockSets } from "@/modules/pages/schema";
import { entries } from "@/modules/entries/schema";
import { treeReferencedTypes, validatePackTree } from "@/modules/pages/blocks-io";
import { slugSchema } from "@/modules/pages/validation";
import { slugify } from "@/lib/slug";
import {
  exportBlockPackJson,
  importPackJson,
  type PortablePack,
} from "./portable";
import type { BlockNode } from "@/blocks/types";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const invalidate = () => {
  updateTag("entries");
  updateTag("entries:block_pack");
  updateTag("block-packs");
};

const OWNER_TYPE = "entry:block_pack";

/** Read a block pack's draft (or published) block tree. */
async function readPackBlocks(id: string, variant: "draft" | "published"): Promise<BlockNode[]> {
  const row = await db.query.blockSets.findFirst({
    where: and(eq(blockSets.ownerType, OWNER_TYPE), eq(blockSets.ownerId, id), eq(blockSets.variant, variant)),
  });
  return (row?.blocks as BlockNode[] | undefined) ?? [];
}

/** Upsert a block pack's block tree for a variant. */
async function writePackBlocks(id: string, variant: "draft" | "published", blocks: BlockNode[], savedBy: string) {
  await db
    .insert(blockSets)
    .values({ ownerType: OWNER_TYPE, ownerId: id, variant, blocks, savedAt: Date.now(), savedBy })
    .onConflictDoUpdate({
      target: [blockSets.ownerType, blockSets.ownerId, blockSets.variant],
      set: { blocks, savedAt: Date.now(), savedBy },
    });
}

/**
 * Save a block pack's draft block tree. Lenient import-style validation
 * (`validatePackTree`): unknown block types are kept (render as placeholders),
 * known types with invalid content are dropped. Recomputes `requiredTypes` and
 * stores diagnostics in the entry's `data`.
 */
export async function saveBlockPackBlocks(
  id: string,
  tree: unknown,
): Promise<Result<{ missingTypes: string[]; dropped: string[] }>> {
  const user = await requireUser();
  const existing = await db.query.entries.findFirst({ where: eq(entries.id, id) });
  if (!existing) return { ok: false, error: "Block pack not found" };
  const v = validatePackTree(tree);
  if (!v.ok) return { ok: false, error: v.error };
  await writePackBlocks(id, "draft", v.blocks, user.id);
  const data = {
    ...(existing.data as Record<string, unknown>),
    requiredTypes: treeReferencedTypes(v.blocks),
  };
  await db.update(entries).set({ data, updatedAt: Date.now() }).where(eq(entries.id, id));
  invalidate();
  return { ok: true, data: { missingTypes: v.missingTypes, dropped: v.dropped } };
}

/** Publish a block pack: copy draft → published. */
export async function publishBlockPack(id: string): Promise<Result> {
  const user = await requireUser();
  const draft = await readPackBlocks(id, "draft");
  const v = validatePackTree(draft);
  if (!v.ok) return { ok: false, error: v.error };
  await writePackBlocks(id, "published", v.blocks, user.id);
  await db
    .update(entries)
    .set({ status: "published", updatedAt: Date.now() })
    .where(eq(entries.id, id));
  await writeAudit({
    userId: user.id,
    action: "block_pack.publish",
    ownerType: OWNER_TYPE,
    ownerId: id,
  });
  invalidate();
  return { ok: true };
}

/**
 * Import a .pack.json (or a library/marketplace entry) as a new block pack.
 * Fail-closed on the format tag; lenient on unknown block types. Stores the
 * pack with the given `source` provenance (and `origin` for marketplace packs).
 */
export async function importBlockPack(
  raw: unknown,
  source: "imported" | "library" | "marketplace" = "imported",
  origin = "",
): Promise<Result<{ id: string; missingTypes: string[]; dropped: string[] }>> {
  const user = await requireUser();
  const parsed = importPackJson(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  if (parsed.kind !== "block-pack") return { ok: false, error: "Not a block pack" };
  const v = validatePackTree(parsed.blocks);
  if (!v.ok) return { ok: false, error: v.error };

  const slug = slugify(parsed.name);
  const slugCheck = slugSchema.safeParse(slug);
  if (!slugCheck.success) return { ok: false, error: "Pack name must produce a valid slug" };
  const dupe = await db.query.entries.findFirst({
    where: and(eq(entries.type, "block_pack"), eq(entries.slug, slugCheck.data)),
  });
  if (dupe) return { ok: false, error: `A block pack named "${parsed.name}" already exists` };

  const data = {
    description: (raw as { description?: string })?.description ?? "",
    requiredTypes: parsed.requiredBlockTypes,
    preview: { colors: (raw as { previewColors?: string[] })?.previewColors ?? [] },
    source,
    origin,
    packVersion: typeof (raw as { version?: number })?.version === "number" ? (raw as { version: number }).version : 1,
  };

  const [row] = await db
    .insert(entries)
    .values({
      type: "block_pack",
      slug: slugCheck.data,
      title: parsed.name,
      status: "published",
      data,
      updatedAt: Date.now(),
    })
    .returning({ id: entries.id });
  await writePackBlocks(row.id, "draft", v.blocks, user.id);
  await writePackBlocks(row.id, "published", v.blocks, user.id);
  await writeAudit({
    userId: user.id,
    action: "block_pack.import",
    ownerType: OWNER_TYPE,
    ownerId: row.id,
    meta: { source, origin, missingTypes: v.missingTypes },
  });
  invalidate();
  return { ok: true, data: { id: row.id, missingTypes: v.missingTypes, dropped: v.dropped } };
}

export type PortablePackExport = PortablePack & {
  requiresConfigTypes: string[];
  excludedTypes: string[];
};

/**
 * Serialize a block pack to a portable `PortablePack` object from its PUBLISHED
 * tree. No auth gate — the public marketplace download route calls this after
 * resolving the entry slug; the admin `exportBlockPack` wrapper adds the
 * `requireUser()` check. The result carries `requiresConfigTypes` (blocks the
 * importer must reconfigure) and `excludedTypes` (blocks stripped by the
 * portability allowlist) so the caller can surface them in the UI.
 */
export async function serializeBlockPack(
  id: string,
): Promise<Result<PortablePackExport>> {
  const existing = await db.query.entries.findFirst({ where: eq(entries.id, id) });
  if (!existing) return { ok: false, error: "Block pack not found" };
  const blocks = await readPackBlocks(id, "published");
  const data = existing.data as { description?: string; packVersion?: number };
  const pack = exportBlockPackJson(
    existing.title,
    blocks,
    { description: data.description, version: data.packVersion },
    Date.now(),
  );
  return { ok: true, data: { ...pack, requiresConfigTypes: pack.requiresConfigTypes ?? [], excludedTypes: pack.excludedTypes ?? [] } };
}

/**
 * Admin export of a block pack (for download or marketplace publishing).
 * Owner-gated; delegates to `serializeBlockPack`.
 */
export async function exportBlockPack(
  id: string,
): Promise<Result<PortablePackExport>> {
  await requireUser();
  return serializeBlockPack(id);
}

/** Delete a block pack and its block trees. */
export async function deleteBlockPack(id: string): Promise<Result> {
  const user = await requireUser();
  await db.delete(blockSets).where(and(eq(blockSets.ownerType, OWNER_TYPE), eq(blockSets.ownerId, id)));
  await db.delete(entries).where(eq(entries.id, id));
  await writeAudit({
    userId: user.id,
    action: "block_pack.delete",
    ownerType: OWNER_TYPE,
    ownerId: id,
  });
  invalidate();
  return { ok: true };
}

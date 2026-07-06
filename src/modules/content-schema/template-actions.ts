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
import { typeTemplateOwner, type TypeTemplateKind } from "@/modules/content-pages/template-owners";

/**
 * Save/publish the owner-designed INDEX or DETAIL template for a table-backed
 * content type. The template is a block tree stored in `block_sets` under owner
 * `type-template:<kind>:<slug>` (the exact key the public renderer reads via
 * content-pages/queries.ts) — so this wraps the generic saveOwnerBlocks/
 * publishOwnerBlocks and, on publish, busts the same cache tags the renderer's
 * `getPublishedTypeTemplate` is keyed on. Owner-only.
 */
type Result = { ok: true } | { ok: false; error: string };

/** Resolve the type's slug from its id (the owner key is slug-based). */
async function slugOf(typeId: string): Promise<string | null> {
  const row = await db.query.customTypes.findFirst({ where: eq(customTypes.id, typeId) });
  return row?.tableName ? row.slug : null;
}

/** Autosave the DRAFT template tree. */
export async function saveDraftTypeTemplate(
  typeId: string,
  kind: TypeTemplateKind,
  tree: unknown,
): Promise<Result> {
  const slug = await slugOf(typeId);
  if (!slug) return { ok: false, error: "Content type not found or not table-backed" };
  return saveOwnerBlocks(typeTemplateOwner(kind, slug), slug, tree);
}

/** Publish the DRAFT template → live, and bust the renderer's cache tags. */
export async function publishTypeTemplate(typeId: string, kind: TypeTemplateKind): Promise<Result> {
  const user = await requireUser("owner");
  const slug = await slugOf(typeId);
  if (!slug) return { ok: false, error: "Content type not found or not table-backed" };
  const res = await publishOwnerBlocks(typeTemplateOwner(kind, slug), slug);
  if (!res.ok) return res;
  updateTag("custom_types");
  updateTag(`type-template:${kind}:${slug}`);
  await writeAudit({
    userId: user.id,
    action: "content_type.template.publish",
    ownerType: "custom_type",
    ownerId: typeId,
  });
  return { ok: true };
}

/**
 * Load a template's draft + published trees for the editor (uncached — admin is
 * dynamic). Returns the draft to edit and whether it differs from published.
 */
export async function loadTypeTemplateForEdit(
  typeId: string,
  kind: TypeTemplateKind,
): Promise<
  | { ok: true; slug: string; blocks: BlockNode[]; draftDiffers: boolean }
  | { ok: false; error: string }
> {
  await requireUser("owner");
  const slug = await slugOf(typeId);
  if (!slug) return { ok: false, error: "Content type not found or not table-backed" };
  const owner = typeTemplateOwner(kind, slug);
  const sets = await db.query.blockSets.findMany({
    where: and(eq(blockSets.ownerType, owner), eq(blockSets.ownerId, slug)),
  });
  const draft = sets.find((s) => s.variant === "draft");
  const published = sets.find((s) => s.variant === "published");
  const blocks = (draft?.blocks ?? published?.blocks ?? []) as BlockNode[];
  const draftDiffers = JSON.stringify(draft?.blocks ?? []) !== JSON.stringify(published?.blocks ?? []);
  return { ok: true, slug, blocks, draftDiffers };
}

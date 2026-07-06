import { cacheLife, cacheTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { blockSets } from "@/modules/pages/schema";
import type { BlockNode } from "@/blocks/types";
import { typeTemplateOwner, rowBlocksOwner, type TypeTemplateKind } from "./template-owners";

/**
 * Owner-designed templates for a content type's public pages live in the same
 * `block_sets` table as pages/entries/chrome, under a dedicated owner namespace
 * (see template-owners.ts). The published variant is read here (cached on the
 * `custom_types` tag, so saving/publishing a type busts it — same tag the
 * content-schema queries use). A type with no template returns `[]`, and the
 * renderer falls back to a sensible default layout.
 */
// Re-export so existing importers of these from queries.ts keep working; the
// canonical (client-safe) home is template-owners.ts.
export { typeTemplateOwner, type TypeTemplateKind };

/** Published template block tree for a content type's index/detail page — cached. */
export async function getPublishedTypeTemplate(
  kind: TypeTemplateKind,
  slug: string,
): Promise<BlockNode[]> {
  "use cache";
  cacheLife("max");
  cacheTag("custom_types", `type-template:${kind}:${slug}`);
  const set = await db.query.blockSets.findFirst({
    where: and(
      eq(blockSets.ownerType, typeTemplateOwner(kind, slug)),
      eq(blockSets.ownerId, slug),
      eq(blockSets.variant, "published"),
    ),
  });
  return (set?.blocks ?? []) as BlockNode[];
}

/**
 * Published block tree for ONE custom-type row's OWN bespoke layout (ownerId = row id),
 * or `[]` if the row has none (→ the caller falls back to the shared type template, then
 * the default field list). Cached on the same `custom_types` tag, keyed per row so
 * saving one row's design busts only its entry.
 */
export async function getPublishedRowBlocks(slug: string, rowId: string): Promise<BlockNode[]> {
  "use cache";
  cacheLife("max");
  cacheTag("custom_types", `entry:custom:${slug}:${rowId}`);
  const set = await db.query.blockSets.findFirst({
    where: and(
      eq(blockSets.ownerType, rowBlocksOwner(slug)),
      eq(blockSets.ownerId, rowId),
      eq(blockSets.variant, "published"),
    ),
  });
  return (set?.blocks ?? []) as BlockNode[];
}

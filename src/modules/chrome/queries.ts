import { cacheLife, cacheTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { blockSets } from "@/modules/pages/schema";
import type { BlockNode } from "@/blocks/types";
import { resolveBoundBlocks } from "@/blocks/resolve-tree";
import { CHROME_OWNER_ID, chromeTag, type ChromeOwnerType } from "./owners";

/**
 * Published chrome block tree for an owner (chrome:header / chrome:footer),
 * cached per owner — the exact mirror of getPublishedPage, reading the same
 * `block_sets` table. The public layout renders the result via RenderBlocks.
 * Missing/empty owners return `[]` so the site still renders unseeded.
 */
export async function getPublishedChrome(ownerType: ChromeOwnerType): Promise<BlockNode[]> {
  "use cache";
  cacheLife("max");
  cacheTag(chromeTag(ownerType));
  const set = await db.query.blockSets.findFirst({
    where: and(
      eq(blockSets.ownerType, ownerType),
      eq(blockSets.ownerId, CHROME_OWNER_ID),
      eq(blockSets.variant, "published"),
    ),
  });
  return (set?.blocks ?? []) as BlockNode[];
}

/**
 * The published header + footer trees with their bound sub-blocks pre-resolved
 * (logo → site name, nav-menu → menu items), ready to render read-only around
 * an editor canvas. Every editor surface (pages/entries/products/collections)
 * calls this so the builder previews the REAL site chrome. Kept here (one place)
 * rather than duplicating the fetch+resolve in four load paths.
 */
export async function getEditorChromePreview(): Promise<{
  headerBlocks: BlockNode[];
  footerBlocks: BlockNode[];
}> {
  const [header, footer] = await Promise.all([
    getPublishedChrome("chrome:header"),
    getPublishedChrome("chrome:footer"),
  ]);
  const [headerBlocks, footerBlocks] = await Promise.all([
    resolveBoundBlocks(header),
    resolveBoundBlocks(footer),
  ]);
  return { headerBlocks, footerBlocks };
}

/**
 * Admin editor load: draft blocks (falling back to published), plus the
 * published snapshot for the dirty-vs-published check. Uncached (admin is
 * dynamic) — mirrors getPageForEdit.
 */
export async function getChromeForEdit(
  ownerType: ChromeOwnerType,
): Promise<{ blocks: BlockNode[]; publishedBlocks: BlockNode[] }> {
  const sets = await db.query.blockSets.findMany({
    where: and(eq(blockSets.ownerType, ownerType), eq(blockSets.ownerId, CHROME_OWNER_ID)),
  });
  const draft = sets.find((s) => s.variant === "draft");
  const published = sets.find((s) => s.variant === "published");
  return {
    blocks: (draft?.blocks ?? published?.blocks ?? []) as BlockNode[],
    publishedBlocks: (published?.blocks ?? []) as BlockNode[],
  };
}

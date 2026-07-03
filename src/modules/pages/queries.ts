import { cacheLife, cacheTag } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import type { BlockNode } from "@/blocks/types";
import { blockSets, pages } from "./schema";

export type PageRow = typeof pages.$inferSelect;

/** Published page + published blocks, cached per route. */
export async function getPublishedPage(
  route: string,
): Promise<{ page: PageRow; blocks: BlockNode[] } | null> {
  "use cache";
  cacheLife("max");
  const page = await db.query.pages.findFirst({
    where: and(eq(pages.route, route), eq(pages.status, "published")),
  });
  if (!page) {
    // Tag misses on the collection so newly published routes appear.
    cacheTag("pages");
    return null;
  }
  cacheTag("pages", `page:${page.id}`);
  const set = await db.query.blockSets.findFirst({
    where: and(
      eq(blockSets.ownerType, "page"),
      eq(blockSets.ownerId, page.id),
      eq(blockSets.variant, "published"),
    ),
  });
  return { page, blocks: (set?.blocks ?? []) as BlockNode[] };
}

/** Admin list — uncached (admin is dynamic). */
export async function listPages(): Promise<PageRow[]> {
  return db.query.pages.findMany({ orderBy: [asc(pages.sortOrder), asc(pages.title)] });
}

/** Admin editor load: page row + draft blocks (falls back to published). */
export async function getPageForEdit(
  id: string,
): Promise<{ page: PageRow; blocks: BlockNode[]; publishedBlocks: BlockNode[] } | null> {
  const page = await db.query.pages.findFirst({ where: eq(pages.id, id) });
  if (!page) return null;
  const sets = await db.query.blockSets.findMany({
    where: and(eq(blockSets.ownerType, "page"), eq(blockSets.ownerId, id)),
  });
  const draft = sets.find((s) => s.variant === "draft");
  const published = sets.find((s) => s.variant === "published");
  return {
    page,
    blocks: (draft?.blocks ?? published?.blocks ?? []) as BlockNode[],
    publishedBlocks: (published?.blocks ?? []) as BlockNode[],
  };
}

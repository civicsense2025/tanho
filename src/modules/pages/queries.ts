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

/** A single breadcrumb: a published ancestor's title + public route. */
export type Ancestor = { id: string; title: string; route: string };

/**
 * Walk a page's `parentId` chain to the root, returning ancestors in
 * root→…→parent order (excludes the page itself). Only published ancestors are
 * included so breadcrumbs never link to unpublished pages. ONE query — the
 * whole parent graph (id/parentId/title/route/status, same full-table shape
 * the sitemap reads) — then an in-memory walk, instead of a serial round-trip
 * per hop. Cycle- and depth-guarded (max 20 hops) against a malformed graph.
 * Cached; tagged `pages` (busted on any page mutation) plus the narrow
 * `page:<id>` tag of every page in the chain, so a single ancestor's
 * title/route edit refreshes this trail even under narrow invalidation.
 */
export async function getPageAncestors(pageId: string): Promise<Ancestor[]> {
  "use cache";
  cacheLife("max");
  cacheTag("pages");
  const rows = await db
    .select({
      id: pages.id,
      parentId: pages.parentId,
      title: pages.title,
      route: pages.route,
      status: pages.status,
    })
    .from(pages);
  const byId = new Map(rows.map((r) => [r.id, r]));

  const chain: Ancestor[] = [];
  const seen = new Set<string>([pageId]);
  cacheTag(`page:${pageId}`);
  let current = byId.get(pageId);
  let hops = 0;
  while (current?.parentId && hops < 20) {
    hops++;
    const parentId: string = current.parentId;
    if (seen.has(parentId)) break; // cycle guard
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    cacheTag(`page:${parent.id}`);
    if (parent.status === "published") {
      chain.push({ id: parent.id, title: parent.title, route: parent.route });
    }
    current = parent;
  }
  return chain.reverse();
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

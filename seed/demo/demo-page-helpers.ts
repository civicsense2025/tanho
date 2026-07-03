import { eq } from "drizzle-orm";
import { pages } from "../../src/modules/pages/schema";
import { log, type SeedDb } from "../lib";
import { putBlockSets, type Block } from "./demo-blocks";

export type PageSeed = {
  slug: string;
  route: string;
  title: string;
  kind?: "page" | "post";
  parentId?: string | null;
  template?: string;
  sortOrder?: number;
  seoTitle?: string;
  seoDescription?: string;
  hasPaywall?: boolean;
  blocks: Block[];
};

/**
 * Upsert a page + its block sets by slug. Returns the page id (useful for
 * parenting posts under the newsletter page). Idempotent: an existing page
 * with the same slug is updated in place rather than duplicated.
 */
export async function upsertPage(db: SeedDb, p: PageSeed): Promise<string> {
  const now = Date.now();
  const row = {
    slug: p.slug,
    route: p.route,
    title: p.title,
    kind: p.kind ?? "page",
    parentId: p.parentId ?? null,
    status: "published" as const,
    sortOrder: p.sortOrder ?? 0,
    template: p.template ?? "landing",
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
    hasPaywall: p.hasPaywall ?? false,
    publishedAt: now,
    updatedAt: now,
  };

  const existing = await db.query.pages.findFirst({ where: eq(pages.slug, p.slug) });
  let id: string;
  if (existing) {
    await db.update(pages).set(row).where(eq(pages.id, existing.id));
    id = existing.id;
  } else {
    const [inserted] = await db.insert(pages).values(row).returning({ id: pages.id });
    id = inserted.id;
  }
  await putBlockSets(db, "page", id, p.blocks);
  log(`demo page: ${p.route} (${p.blocks.length} blocks)`);
  return id;
}

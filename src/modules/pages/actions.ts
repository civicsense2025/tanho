"use server";

import { updateTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { rebuildMediaUsage } from "@/modules/media/usage";
import { blockSets, pages } from "./schema";
import { treeHasPaywall, validateBlockTree } from "./blocks-io";
import { pageDetailsSchema } from "./validation";
import { ROUTE_TYPE } from "@/modules/entries/router";
import { resolveCodePage } from "@/app/(public)/code-pages/registry";

/** True when `route` collides with a reserved entity-route prefix (/work, /guides, /resources) or an exact code-page route. */
function collidesWithReservedRoute(route: string): boolean {
  if (resolveCodePage(route)) return true;
  const firstSegment = route.split("/").filter(Boolean)[0];
  return firstSegment !== undefined && firstSegment in ROUTE_TYPE;
}

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const invalidatePage = (id: string) => {
  updateTag("pages");
  updateTag(`page:${id}`);
};

export async function createPage(input: unknown): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const parsed = pageDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid page" };
  }
  const d = parsed.data;
  if (collidesWithReservedRoute(d.route)) {
    return { ok: false, error: `Route ${d.route} is reserved by a built-in section of the site` };
  }
  const dupe = await db.query.pages.findFirst({
    where: eq(pages.route, d.route),
  });
  if (dupe) return { ok: false, error: `Route ${d.route} is already in use` };

  const [row] = await db
    .insert(pages)
    .values({ ...d, updatedAt: Date.now() })
    .returning({ id: pages.id });
  await writeAudit({ userId: user.id, action: "page.create", ownerType: "page", ownerId: row.id });
  invalidatePage(row.id);
  return { ok: true, data: { id: row.id } };
}

export async function savePageDetails(id: string, input: unknown): Promise<Result> {
  const user = await requireUser();
  const parsed = pageDetailsSchema.partial().safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid page" };
  }
  await db
    .update(pages)
    .set({ ...parsed.data, updatedAt: Date.now() })
    .where(eq(pages.id, id));
  await writeAudit({ userId: user.id, action: "page.details", ownerType: "page", ownerId: id });
  invalidatePage(id);
  return { ok: true };
}

/** Autosave target — writes the DRAFT variant only. */
export async function saveDraftBlocks(id: string, tree: unknown): Promise<Result> {
  const user = await requireUser();
  const v = validateBlockTree(tree);
  if (!v.ok) return { ok: false, error: v.error };
  await db
    .insert(blockSets)
    .values({
      ownerType: "page",
      ownerId: id,
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

/** Publish = copy draft → published + flip status + recompute hasPaywall. */
export async function publishPage(id: string): Promise<Result> {
  const user = await requireUser();
  const draft = await db.query.blockSets.findFirst({
    where: and(
      eq(blockSets.ownerType, "page"),
      eq(blockSets.ownerId, id),
      eq(blockSets.variant, "draft"),
    ),
  });
  const v = validateBlockTree(draft?.blocks ?? []);
  if (!v.ok) return { ok: false, error: v.error };

  await db
    .insert(blockSets)
    .values({
      ownerType: "page",
      ownerId: id,
      variant: "published",
      blocks: v.blocks,
      savedAt: Date.now(),
      savedBy: user.id,
    })
    .onConflictDoUpdate({
      target: [blockSets.ownerType, blockSets.ownerId, blockSets.variant],
      set: { blocks: v.blocks, savedAt: Date.now(), savedBy: user.id },
    });
  const row = await db
    .update(pages)
    .set({
      status: "published",
      hasPaywall: treeHasPaywall(v.blocks),
      publishedAt: Date.now(),
      updatedAt: Date.now(),
    })
    .where(eq(pages.id, id))
    .returning({ route: pages.route })
    .then((r) => r[0]);
  // Media usage reflects the PUBLISHED tree — rebuilt on every publish.
  await rebuildMediaUsage("page", id, row?.route ?? "", v.blocks);
  await writeAudit({ userId: user.id, action: "page.publish", ownerType: "page", ownerId: id });
  invalidatePage(id);
  return { ok: true };
}

export async function deletePage(id: string): Promise<Result> {
  const user = await requireUser();
  await db.delete(blockSets).where(and(eq(blockSets.ownerType, "page"), eq(blockSets.ownerId, id)));
  await db.delete(pages).where(eq(pages.id, id));
  await writeAudit({ userId: user.id, action: "page.delete", ownerType: "page", ownerId: id });
  invalidatePage(id);
  return { ok: true };
}

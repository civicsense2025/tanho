"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { rebuildMediaUsage } from "@/modules/media/usage";
import { recordSlugChange } from "@/modules/seo";
import { indexPage, removePageFromIndex } from "@/modules/search/index-document";
import { blockSets, pages } from "./schema";
import { treeHasPaywall } from "./blocks-io";
import { pageDetailsSchema, secureCustomCode } from "./validation";
import { ROUTE_TYPE } from "@/modules/entries/router";
import { resolveCodePage } from "@/app/(public)/code-pages/registry";
import { saveOwnerBlocks, publishOwnerBlocks } from "@/modules/blocks/actions";

/** Unique "untitled" slug for a new page, avoiding collisions. */
async function uniqueUntitledSlug(): Promise<string> {
  const base = "untitled";
  let slug = base;
  let n = 2;
  while (await db.query.pages.findFirst({ where: eq(pages.slug, slug) })) {
    slug = `${base}-${n}`;
    n++;
  }
  return slug;
}

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
  secureCustomCode(d as Record<string, unknown>, user.role === "owner");
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

/**
 * Create a blank page and immediately redirect into the block editor.
 * Used by the dashboard "+ New page/post" button so users never see the old
 * title/slug form.
 */
export async function createBlankPage(kind: "page" | "post" = "page"): Promise<never> {
  const slug = await uniqueUntitledSlug();
  const route = `/${slug}`;
  const title = `Untitled ${kind}`;
  const res = await createPage({
    title,
    slug,
    route,
    kind,
    template: "blank",
    status: "draft",
  });
  if (!res.ok) throw new Error(res.error);
  redirect(`/admin/pages/${res.data!.id}`);
}

export async function savePageDetails(id: string, input: unknown): Promise<Result> {
  const user = await requireUser();
  const parsed = pageDetailsSchema.partial().safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid page" };
  }
  secureCustomCode(parsed.data as Record<string, unknown>, user.role === "owner");
  // Same checks createPage runs — an edit can shadow a reserved route or
  // collide with another page's route exactly as easily as creation can.
  let oldRoute: string | null = null;
  if (parsed.data.route !== undefined) {
    if (collidesWithReservedRoute(parsed.data.route)) {
      return { ok: false, error: `Route ${parsed.data.route} is reserved by a built-in section of the site` };
    }
    const dupe = await db.query.pages.findFirst({
      where: and(eq(pages.route, parsed.data.route), ne(pages.id, id)),
    });
    if (dupe) return { ok: false, error: `Route ${parsed.data.route} is already in use` };
    // Capture the current route so a rename can be turned into a 301 below.
    const current = await db.query.pages.findFirst({
      where: eq(pages.id, id),
      columns: { route: true },
    });
    oldRoute = current?.route ?? null;
  }
  await db
    .update(pages)
    .set({ ...parsed.data, updatedAt: Date.now() })
    .where(eq(pages.id, id));
  // A published page that changed its route keeps its old URL working: create a
  // 301 old→new and log it, so inbound links + rankings survive the rename.
  if (oldRoute && parsed.data.route && oldRoute !== parsed.data.route) {
    await recordSlugChange("page", id, oldRoute, parsed.data.route);
    updateTag("redirects");
  }
  await writeAudit({ userId: user.id, action: "page.details", ownerType: "page", ownerId: id });
  invalidatePage(id);
  return { ok: true };
}

/** Autosave target — writes the DRAFT variant only. */
export async function saveDraftBlocks(id: string, tree: unknown): Promise<Result> {
  return saveOwnerBlocks("page", id, tree);
}

/** Publish = copy draft → published + flip status + recompute hasPaywall. */
export async function publishPage(id: string): Promise<Result> {
  const user = await requireUser();
  const published = await publishOwnerBlocks("page", id);
  if (!published.ok) return published;

  const row = await db
    .update(pages)
    .set({
      status: "published",
      hasPaywall: treeHasPaywall(published.blocks),
      publishedAt: Date.now(),
      updatedAt: Date.now(),
    })
    .where(eq(pages.id, id))
    .returning({ route: pages.route, title: pages.title })
    .then((r) => r[0]);
  // Media usage reflects the PUBLISHED tree — rebuilt on every publish.
  await rebuildMediaUsage("page", id, row?.route ?? "", published.blocks);
  await indexPage({ id, route: row?.route ?? "", title: row?.title ?? "", blocks: published.blocks });
  await writeAudit({ userId: user.id, action: "page.publish", ownerType: "page", ownerId: id });
  invalidatePage(id);
  return { ok: true };
}

export async function deletePage(id: string): Promise<Result> {
  const user = await requireUser();
  await db.delete(blockSets).where(and(eq(blockSets.ownerType, "page"), eq(blockSets.ownerId, id)));
  await db.delete(pages).where(eq(pages.id, id));
  await removePageFromIndex(id);
  await writeAudit({ userId: user.id, action: "page.delete", ownerType: "page", ownerId: id });
  invalidatePage(id);
  return { ok: true };
}

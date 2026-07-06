import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { blockSets, pages } from "@/modules/pages/schema";
import { validateBlockTree, treeHasPaywall } from "@/modules/pages/blocks-io";
import { rebuildMediaUsage } from "@/modules/media/usage";
import { indexPage } from "@/modules/search/index-document";
import { db } from "@/lib/db/client";
import { eq, and } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { handle, ok, fail } from "@/lib/api/v1";

// Route handlers must use revalidateTag, NOT updateTag (Server-Action-only).
const invalidatePage = (id: string) => {
  revalidateTag("pages", "max");
  revalidateTag(`page:${id}`, "max");
};

/**
 * POST /api/v1/pages/:id/publish — copy draft → published, flip status,
 * recompute hasPaywall, rebuild media usage. Mirrors `publishPage`.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const draft = await db.query.blockSets.findFirst({
      where: and(
        eq(blockSets.ownerType, "page"),
        eq(blockSets.ownerId, id),
        eq(blockSets.variant, "draft"),
      ),
    });
    const v = validateBlockTree(draft?.blocks ?? []);
    if (!v.ok) return fail(v.error, 400);

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
      .returning({ route: pages.route, title: pages.title })
      .then((r) => r[0]);
    await rebuildMediaUsage("page", id, row?.route ?? "", v.blocks);
    await indexPage({ id, route: row?.route ?? "", title: row?.title ?? "", blocks: v.blocks });
    await writeAudit({ userId: user.id, action: "page.publish", ownerType: "page", ownerId: id });
    invalidatePage(id);
    return ok();
  });
}

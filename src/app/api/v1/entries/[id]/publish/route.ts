import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { blockSets } from "@/modules/pages/schema";
import { validateBlockTree } from "@/modules/pages/blocks-io";
import { rebuildMediaUsage } from "@/modules/media/usage";
import { entries } from "@/modules/entries/schema";
import { getEntitySchema } from "@/entities/registry-async";
import { db } from "@/lib/db/client";
import { and, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { handle, ok, fail } from "@/lib/api/v1";

const invalidate = (type: string) => {
  updateTag("entries");
  updateTag(`entries:${type}`);
};

/**
 * POST /api/v1/entries/:id/publish — copy draft → published, rebuild media
 * usage. Mirrors `publishEntryBlocks`.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const existing = await db.query.entries.findFirst({ where: eq(entries.id, id) });
    if (!existing) return fail("Entry not found", 404);
    const ownerType = `entry:${existing.type}`;
    const draft = await db.query.blockSets.findFirst({
      where: and(eq(blockSets.ownerType, ownerType), eq(blockSets.ownerId, id), eq(blockSets.variant, "draft")),
    });
    const v = validateBlockTree(draft?.blocks ?? []);
    if (!v.ok) return fail(v.error, 400);

    await db
      .insert(blockSets)
      .values({
        ownerType,
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

    const schema = await getEntitySchema(existing.type);
    const route = `${schema?.basePath ?? ""}/${existing.slug}`;
    await rebuildMediaUsage(ownerType, id, route, v.blocks);
    await writeAudit({ userId: user.id, action: "entry.publish", ownerType, ownerId: id });
    invalidate(existing.type);
    return ok();
  });
}

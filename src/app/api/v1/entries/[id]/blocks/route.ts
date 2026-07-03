import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { blockSets } from "@/modules/pages/schema";
import { validateBlockTree } from "@/modules/pages/blocks-io";
import { entries } from "@/modules/entries/schema";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/**
 * PUT /api/v1/entries/:id/blocks — replace the DRAFT block tree for an entry.
 * Body: BlockNode[]. Autosave target for the editor. Mirrors `saveEntryDraftBlocks`.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const existing = await db.query.entries.findFirst({ where: eq(entries.id, id) });
    if (!existing) return fail("Entry not found", 404);
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const v = validateBlockTree(body);
    if (!v.ok) return fail(v.error, 400);
    const ownerType = `entry:${existing.type}`;
    await db
      .insert(blockSets)
      .values({
        ownerType,
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
    return ok();
  });
}

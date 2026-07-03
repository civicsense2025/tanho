import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { tags, taggings } from "@/modules/tags/schema";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { handle, ok, fail } from "@/lib/api/v1";

/** DELETE /api/v1/tags/:id — delete a tag and cascade its assignments. Owner-only. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    const { id } = await params;
    if (!id) return fail("Missing tag id", 400);
    await db.delete(taggings).where(eq(taggings.tagId, id));
    await db.delete(tags).where(eq(tags.id, id));
    await writeAudit({ userId: user.id, action: "tag.delete", ownerType: "tag", ownerId: id });
    return ok();
  });
}

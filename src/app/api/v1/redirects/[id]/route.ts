import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { redirects } from "@/modules/redirects/schema";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { handle, ok } from "@/lib/api/v1";

/** DELETE /api/v1/redirects/:id — delete a redirect. Owner-only. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    const { id } = await params;
    await db.delete(redirects).where(eq(redirects.id, id));
    revalidateTag("redirects", "max");
    await writeAudit({ userId: user.id, action: "redirect.delete", ownerType: "redirect", ownerId: id });
    return ok();
  });
}

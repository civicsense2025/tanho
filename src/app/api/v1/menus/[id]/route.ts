import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { menus } from "@/modules/menus/schema";
import { MAX_MENU_BYTES, menuSchema } from "@/modules/menus/validation";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/**
 * PATCH /api/v1/menus/:id — update a menu. Body: menuSchema. Editor+.
 * DELETE /api/v1/menus/:id — delete a menu. Owner-only.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const existing = await db.query.menus.findFirst({ where: eq(menus.id, id) });
    if (!existing) return fail("Menu not found", 404);
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    if (JSON.stringify(body ?? {}).length > MAX_MENU_BYTES) return fail("Menu is too large", 400);
    const parsed = menuSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid menu", 400);
    }
    await db.update(menus).set({ ...parsed.data, updatedAt: Date.now() }).where(eq(menus.id, id));
    updateTag("menus");
    await writeAudit({ userId: user.id, action: "menu.save", ownerType: "menu", ownerId: id });
    return ok();
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    const { id } = await params;
    await db.delete(menus).where(eq(menus.id, id));
    updateTag("menus");
    await writeAudit({ userId: user.id, action: "menu.delete", ownerType: "menu", ownerId: id });
    return ok();
  });
}

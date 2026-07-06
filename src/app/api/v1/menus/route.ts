import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { listMenus } from "@/modules/menus/queries";
import { menus } from "@/modules/menus/schema";
import { MAX_MENU_BYTES, menuSchema } from "@/modules/menus/validation";
import { db } from "@/lib/db/client";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/**
 * GET /api/v1/menus — list all menus. Editor+.
 * POST /api/v1/menus — create. Body: menuSchema. Editor+.
 */
export async function GET(): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    return ok(await listMenus());
  });
}

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    if (JSON.stringify(body ?? {}).length > MAX_MENU_BYTES) return fail("Menu is too large", 400);
    const parsed = menuSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid menu", 400);
    }
    const [row] = await db
      .insert(menus)
      .values({ ...parsed.data, updatedAt: Date.now() })
      .returning({ id: menus.id });
    revalidateTag("menus", "max");
    await writeAudit({ userId: user.id, action: "menu.create", ownerType: "menu", ownerId: row.id });
    return ok({ id: row.id }, 201);
  });
}

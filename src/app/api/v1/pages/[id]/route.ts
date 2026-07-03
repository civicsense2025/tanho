import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { getPageForEdit } from "@/modules/pages/queries";
import { pages, blockSets } from "@/modules/pages/schema";
import { pageDetailsSchema } from "@/modules/pages/validation";
import { db } from "@/lib/db/client";
import { eq, and } from "drizzle-orm";
import { updateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

const invalidatePage = (id: string) => {
  updateTag("pages");
  updateTag(`page:${id}`);
};

/**
 * GET /api/v1/pages/:id — page row + draft blocks (falls back to published).
 *   ?resolve=1 — not yet supported for pages; bound blocks resolve at render.
 * PATCH /api/v1/pages/:id — update page details (partial). Body: partial pageDetailsSchema.
 * DELETE /api/v1/pages/:id — delete a page and its block sets.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const { id } = await params;
    const data = await getPageForEdit(id);
    if (!data) return fail("Page not found", 404);
    return ok(data);
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = pageDetailsSchema.partial().safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid page", 400);
    }
    await db.update(pages).set({ ...parsed.data, updatedAt: Date.now() }).where(eq(pages.id, id));
    await writeAudit({ userId: user.id, action: "page.details", ownerType: "page", ownerId: id });
    invalidatePage(id);
    return ok();
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    await db.delete(blockSets).where(and(eq(blockSets.ownerType, "page"), eq(blockSets.ownerId, id)));
    await db.delete(pages).where(eq(pages.id, id));
    await writeAudit({ userId: user.id, action: "page.delete", ownerType: "page", ownerId: id });
    invalidatePage(id);
    return ok();
  });
}

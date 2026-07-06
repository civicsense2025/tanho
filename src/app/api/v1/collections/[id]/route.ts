import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { collections, productCollections } from "@/modules/commerce/schema";
import { collectionSchema } from "@/modules/commerce/validation";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

const invalidate = () => {
  revalidateTag("products", "max");
  revalidateTag("storefront", "max");
};

/**
 * GET /api/v1/collections/:id — one collection. Editor+.
 * PATCH /api/v1/collections/:id — update (partial). Editor+.
 * DELETE /api/v1/collections/:id — delete + membership links. Owner-only.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const { id } = await params;
    const row = await db.query.collections.findFirst({ where: eq(collections.id, id) });
    if (!row) return fail("Collection not found", 404);
    return ok(row);
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const existing = await db.query.collections.findFirst({ where: eq(collections.id, id) });
    if (!existing) return fail("Collection not found", 404);
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = collectionSchema.partial().safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid collection", 400);
    }
    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const dupe = await db.query.collections.findFirst({ where: eq(collections.slug, parsed.data.slug) });
      if (dupe) return fail(`Slug ${parsed.data.slug} is already in use`, 409);
    }
    await db.update(collections).set(parsed.data).where(eq(collections.id, id));
    await writeAudit({ userId: user.id, action: "collection.update", ownerType: "collection", ownerId: id });
    invalidate();
    return ok();
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    const { id } = await params;
    await db.delete(productCollections).where(eq(productCollections.collectionId, id));
    await db.delete(collections).where(eq(collections.id, id));
    await writeAudit({ userId: user.id, action: "collection.delete", ownerType: "collection", ownerId: id });
    invalidate();
    return ok();
  });
}

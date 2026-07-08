import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { getProduct } from "@/modules/commerce/queries";
import { products } from "@/modules/commerce/schema";
import { productSchema } from "@/modules/commerce/validation";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "../../_lib";

/**
 * GET /api/v1/products/:id — one product with variants + collection ids.
 * PATCH /api/v1/products/:id — update product fields (partial). Editor+.
 * DELETE /api/v1/products/:id — delete a product. Owner-only.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const { id } = await params;
    const data = await getProduct(id);
    if (!data) return fail("Product not found", 404);
    return ok(data);
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = productSchema.partial().safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid product", 400);
    }
    await db.update(products).set({ ...parsed.data, updatedAt: Date.now() }).where(eq(products.id, id));
    revalidateTag("products", "max");
    await writeAudit({ userId: user.id, action: "product.update", ownerType: "product", ownerId: id });
    return ok();
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    const { id } = await params;
    await db.delete(products).where(eq(products.id, id));
    revalidateTag("products", "max");
    await writeAudit({ userId: user.id, action: "product.delete", ownerType: "product", ownerId: id });
    return ok();
  });
}

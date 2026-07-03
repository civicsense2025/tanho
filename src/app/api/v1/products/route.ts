import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { listProducts } from "@/modules/commerce/queries";
import { products } from "@/modules/commerce/schema";
import { productSchema } from "@/modules/commerce/validation";
import { db } from "@/lib/db/client";
import { updateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/**
 * GET /api/v1/products — list products. Optional ?search=&status= filters.
 * POST /api/v1/products — create a product. Body: productSchema. Editor+.
 */
export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const url = new URL(req.url);
    const search = url.searchParams.get("search") ?? undefined;
    const status = (url.searchParams.get("status") as "draft" | "active" | null) ?? undefined;
    return ok(await listProducts(search, status));
  });
}

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid product", 400);
    }
    const [row] = await db
      .insert(products)
      .values({ ...parsed.data, updatedAt: Date.now() })
      .returning({ id: products.id });
    updateTag("products");
    await writeAudit({ userId: user.id, action: "product.create", ownerType: "product", ownerId: row.id });
    return ok({ id: row.id }, 201);
  });
}

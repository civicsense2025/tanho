import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { productVariants } from "@/modules/commerce/schema";
import { variantSchema } from "@/modules/commerce/validation";
import { db } from "@/lib/db/client";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

/**
 * POST /api/v1/products/:id/variants — add a variant to a product. Editor+.
 * Body: variantSchema (without id).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = variantSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid variant", 400);
    }
    const [row] = await db
      .insert(productVariants)
      .values({ ...parsed.data, productId: id })
      .returning({ id: productVariants.id });
    revalidateTag("products", "max");
    await writeAudit({ userId: user.id, action: "product.variant.create", ownerType: "product", ownerId: id });
    return ok({ id: row.id }, 201);
  });
}

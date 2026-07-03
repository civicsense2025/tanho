import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { orderItems, orders, productVariants, products } from "@/modules/commerce/schema";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { updateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

const trackingSchema = z.object({ tracking: z.string().max(120).default("") });

const invalidate = () => {
  updateTag("orders");
  updateTag("storefront");
};

/**
 * POST /api/v1/orders/:id/fulfill — mark fulfilled + decrement inventory.
 * Body: { tracking?: string }. Editor+.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
    if (!order) return fail("Order not found", 404);
    if (order.status === "refunded" || order.status === "disputed") {
      return fail(`Cannot fulfill a ${order.status} order`, 409);
    }
    const body = await parseBody(req);
    const parsed = trackingSchema.safeParse(body ?? {});
    if (!parsed.success) return fail("Invalid tracking number", 400);

    const items = await db.query.orderItems.findMany({ where: eq(orderItems.orderId, id) });
    for (const item of items) {
      if (item.variantId) {
        const variant = await db.query.productVariants.findFirst({ where: eq(productVariants.id, item.variantId) });
        if (variant) {
          await db
            .update(productVariants)
            .set({ inventory: Math.max(0, variant.inventory - item.qty) })
            .where(eq(productVariants.id, item.variantId));
        }
      } else if (item.productId) {
        const product = await db.query.products.findFirst({ where: eq(products.id, item.productId) });
        if (product && product.trackInventory) {
          await db
            .update(products)
            .set({ inventory: Math.max(0, product.inventory - item.qty), updatedAt: Date.now() })
            .where(eq(products.id, item.productId));
        }
      }
    }

    await db.update(orders).set({ status: "fulfilled", tracking: parsed.data.tracking }).where(eq(orders.id, id));
    await writeAudit({ userId: user.id, action: "order.fulfill", ownerType: "order", ownerId: id, meta: { tracking: parsed.data.tracking } });
    invalidate();
    return ok();
  });
}

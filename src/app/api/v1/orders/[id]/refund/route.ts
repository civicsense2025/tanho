import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { orders } from "@/modules/commerce/schema";
import { payments } from "@/adapters/payments";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { handle, ok, fail } from "@/lib/api/v1";

const invalidate = () => {
  updateTag("orders");
  updateTag("storefront");
};

/**
 * POST /api/v1/orders/:id/refund — refund via the payments adapter, then mark
 * refunded (the Stripe webhook reconciles final state). Owner-only.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser("owner");
    const { id } = await params;
    const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
    if (!order) return fail("Order not found", 404);
    if (!order.stripePaymentIntentId) return fail("No payment to refund on this order", 409);
    if (order.status === "refunded") return ok();

    try {
      await payments.refund(order.stripePaymentIntentId);
    } catch (err) {
      return fail(err instanceof Error ? err.message : "Refund failed", 502);
    }

    await db.update(orders).set({ status: "refunded" }).where(eq(orders.id, id));
    await writeAudit({
      userId: user.id,
      action: "order.refund",
      ownerType: "order",
      ownerId: id,
      meta: { paymentIntentId: order.stripePaymentIntentId, amountCents: order.totalCents },
    });
    invalidate();
    return ok();
  });
}

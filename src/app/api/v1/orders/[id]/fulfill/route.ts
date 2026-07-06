import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { orders } from "@/modules/commerce/schema";
import { db } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";

const trackingSchema = z.object({ tracking: z.string().max(120).default("") });

const invalidate = () => {
  revalidateTag("orders", "max");
  revalidateTag("storefront", "max");
};

/**
 * POST /api/v1/orders/:id/fulfill — mark fulfilled. Body: { tracking?: string }.
 * Editor+. Inventory is NOT touched here — it's decremented exactly once, at
 * the pending->paid transition in the Stripe webhook state machine
 * (commerce/stripe-events.ts's onCheckoutCompleted), same contract as the
 * server-action equivalent (commerce/order-actions.ts's fulfillOrder) —
 * decrementing it again here would double-count every fulfillment.
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

    await db.update(orders).set({ status: "fulfilled", tracking: parsed.data.tracking }).where(eq(orders.id, id));
    await writeAudit({ userId: user.id, action: "order.fulfill", ownerType: "order", ownerId: id, meta: { tracking: parsed.data.tracking } });
    invalidate();
    return ok();
  });
}

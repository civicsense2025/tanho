import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { getOrder } from "@/modules/commerce/queries";
import { handle, ok, fail } from "@/lib/api/v1";

/** GET /api/v1/orders/:id — one order with items, dispute, and linked person. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const { id } = await params;
    const data = await getOrder(id);
    if (!data) return fail("Order not found", 404);
    return ok(data);
  });
}

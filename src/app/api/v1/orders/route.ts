import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { listOrders, type OrderTab } from "@/modules/commerce/queries";
import { handle, ok } from "../_lib";

/**
 * GET /api/v1/orders — list orders. Optional ?tab=all|unfulfilled|fulfilled|disputed|refunded
 * and ?search= filters. Editor+.
 */
export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const url = new URL(req.url);
    const tab = (url.searchParams.get("tab") as OrderTab | null) ?? "all";
    const search = url.searchParams.get("search") ?? undefined;
    return ok(await listOrders(tab, search));
  });
}

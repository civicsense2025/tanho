import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { handle, ok, fail } from "@/lib/api/v1";
import { getOrComputeAggregate } from "@/modules/reviews/queries";

/**
 * GET /api/v1/reviews/aggregate — cached (or compute-on-demand) aggregate for a
 * target. Query params: targetType, targetId (both required).
 */
export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const url = new URL(req.url);
    const targetType = url.searchParams.get("targetType");
    const targetId = url.searchParams.get("targetId");
    if (!targetType || !targetId) return fail("targetType and targetId are required", 400);
    const data = await getOrComputeAggregate(targetType, targetId);
    return ok(data);
  });
}

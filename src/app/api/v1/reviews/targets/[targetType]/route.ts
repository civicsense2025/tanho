import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { handle, ok } from "@/lib/api/v1";
import { getReviewTargetConfig } from "@/modules/reviews/queries";

/**
 * GET /api/v1/reviews/targets/:targetType — resolved config for a target type
 * (DB row or the documented defaults).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ targetType: string }> },
): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const { targetType } = await params;
    const config = await getReviewTargetConfig(targetType);
    return ok(config);
  });
}

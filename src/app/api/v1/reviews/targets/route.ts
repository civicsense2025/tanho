import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { db } from "@/lib/db/client";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";
import { reviewTargets } from "@/modules/reviews/schema";
import { reviewTargetConfigSchema } from "@/modules/reviews/validation";
import { DEFAULT_REVIEW_TARGET_CONFIG } from "@/modules/reviews/queries";

/**
 * GET /api/v1/reviews/targets — list all target configs + the documented default
 *   config for reference.
 * PUT /api/v1/reviews/targets — upsert a per-target-type config.
 *   Body: reviewTargetConfigSchema. action "review.target.config".
 */
export async function GET(): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const configs = await db.query.reviewTargets.findMany();
    return ok({ configs, defaults: DEFAULT_REVIEW_TARGET_CONFIG });
  });
}

export async function PUT(req: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = reviewTargetConfigSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid config", 400);
    }
    const { targetType, ...rest } = parsed.data;

    await db
      .insert(reviewTargets)
      .values({ targetType, ...rest, updatedAt: Date.now() })
      .onConflictDoUpdate({
        target: reviewTargets.targetType,
        set: { ...rest, updatedAt: Date.now() },
      });

    revalidateTag("reviews", "max");
    await writeAudit({
      userId: user.id,
      action: "review.target.config",
      ownerType: "review-target",
      ownerId: targetType,
      meta: rest,
    });
    return ok();
  });
}

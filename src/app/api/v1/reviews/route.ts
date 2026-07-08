import { z } from "zod";
import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { db } from "@/lib/db/client";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";
import { reviews } from "@/modules/reviews/schema";
import {
  reviewSubmitSchema,
  reviewSortSchema,
  type ReviewSort,
} from "@/modules/reviews/validation";
import {
  listReviewsForTarget,
  computeVerified,
  getReviewTargetConfig,
  recomputeAggregate,
} from "@/modules/reviews/queries";

/**
 * GET /api/v1/reviews — list reviews for a target. Query params:
 *   targetType, targetId (required), status (default "approved"), sort, limit, offset.
 * POST /api/v1/reviews — admin/programmatic submit. Body: reviewSubmitSchema + personId.
 *   The admin user is treated as the reviewer's proxy. Computes verified via
 *   computeVerified(), sets status from the target's moderation policy, source "api".
 */
export async function GET(req: Request): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const url = new URL(req.url);
    const targetType = url.searchParams.get("targetType");
    const targetId = url.searchParams.get("targetId");
    if (!targetType || !targetId) return fail("targetType and targetId are required", 400);
    const statusParam = url.searchParams.get("status");
    const status =
      statusParam === "null" || statusParam === "all"
        ? undefined
        : ((statusParam as "pending" | "approved" | "rejected" | "hidden") ?? "approved");
    const sortRaw = url.searchParams.get("sort");
    const sortParsed = reviewSortSchema.safeParse(sortRaw);
    const sort: ReviewSort | undefined = sortParsed.success ? sortParsed.data : undefined;
    const limit = url.searchParams.get("limit")
      ? Number(url.searchParams.get("limit"))
      : undefined;
    const offset = url.searchParams.get("offset")
      ? Number(url.searchParams.get("offset"))
      : undefined;
    const data = await listReviewsForTarget(targetType, targetId, { status, sort, limit, offset });
    return ok(data);
  });
}

export async function POST(req: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);

    // reviewSubmitSchema + the personId we're submitting on behalf of.
    const apiSubmitSchema = reviewSubmitSchema.extend({
      personId: z.string().min(1).max(80),
    });
    const parsed = apiSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid review", 400);
    }
    const { targetType, targetId, personId, rating, title, body: reviewBody, photos, meta } =
      parsed.data;

    const config = await getReviewTargetConfig(targetType);
    if (config.allowRating) {
      if (rating < config.minRating || rating > config.maxRating) {
        return fail(`Rating must be between ${config.minRating} and ${config.maxRating}.`, 400);
      }
    } else if (rating !== 0) {
      return fail("This content accepts comments only, not star ratings.", 400);
    }

    const verified = await computeVerified(personId, targetType, targetId);
    const status: "pending" | "approved" = config.moderation === "pre" ? "pending" : "approved";

    const [row] = await db
      .insert(reviews)
      .values({
        targetType,
        targetId,
        personId,
        rating,
        title,
        body: reviewBody,
        photos,
        meta,
        status,
        verified: verified.verified,
        verifiedMethod: verified.method,
        verifiedRef: verified.ref ?? null,
        source: "api",
        updatedAt: Date.now(),
      })
      .returning({ id: reviews.id });

    if (status === "approved") await recomputeAggregate(targetType, targetId);
    revalidateTag("reviews", "max");
    await writeAudit({
      userId: user.id,
      action: "review.create",
      ownerType: "review",
      ownerId: row.id,
      meta: { targetType, targetId, personId, status, verified: verified.verified },
    });
    return ok({ id: row.id }, 201);
  });
}

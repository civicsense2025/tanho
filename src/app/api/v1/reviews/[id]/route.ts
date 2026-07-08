import { eq } from "drizzle-orm";
import { requireApiUser } from "@/modules/auth/api-tokens/guards";
import { writeAudit } from "@/modules/audit/log";
import { db } from "@/lib/db/client";
import { revalidateTag } from "next/cache";
import { handle, ok, fail, parseBody } from "@/lib/api/v1";
import { reviews, reviewReplies, reviewVotes } from "@/modules/reviews/schema";
import { reviewUpdateSchema } from "@/modules/reviews/validation";
import {
  getReview,
  getReviewTargetConfig,
  computeVerified,
  recomputeAggregate,
} from "@/modules/reviews/queries";

/**
 * GET /api/v1/reviews/:id — one review (raw row).
 * PATCH /api/v1/reviews/:id — update review fields. Rechecks verified, resets
 *   status per the target's moderation policy (pre→pending, post→approved).
 * DELETE /api/v1/reviews/:id — delete the review + its replies + votes.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(async () => {
    await requireApiUser();
    const { id } = await params;
    const data = await getReview(id);
    if (!data) return fail("Review not found", 404);
    return ok(data);
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const review = await getReview(id);
    if (!review) return fail("Review not found", 404);

    const body = await parseBody(req);
    if (body === null) return fail("Invalid JSON body", 400);
    const parsed = reviewUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid review", 400);
    }
    const { rating, title, body: reviewBody, photos, meta } = parsed.data;

    const config = await getReviewTargetConfig(review.targetType);
    if (config.allowRating) {
      if (rating < config.minRating || rating > config.maxRating) {
        return fail(`Rating must be between ${config.minRating} and ${config.maxRating}.`, 400);
      }
    } else if (rating !== 0) {
      return fail("This content accepts comments only.", 400);
    }

    // Re-check verified on edit (a refund/cancel could revoke it).
    const verified = await computeVerified(review.personId, review.targetType, review.targetId);
    const nextStatus: "pending" | "approved" = config.moderation === "pre" ? "pending" : "approved";

    await db
      .update(reviews)
      .set({
        rating,
        title,
        body: reviewBody,
        photos,
        meta,
        verified: verified.verified,
        verifiedMethod: verified.method,
        verifiedRef: verified.ref ?? null,
        status: nextStatus,
        updatedAt: Date.now(),
      })
      .where(eq(reviews.id, id));

    if (nextStatus === "approved") await recomputeAggregate(review.targetType, review.targetId);
    revalidateTag("reviews", "max");
    await writeAudit({
      userId: user.id,
      action: "review.update",
      ownerType: "review",
      ownerId: id,
      meta: { personId: review.personId, status: nextStatus },
    });
    return ok();
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const review = await getReview(id);
    if (!review) return fail("Review not found", 404);

    await db.delete(reviews).where(eq(reviews.id, id));
    await db.delete(reviewReplies).where(eq(reviewReplies.reviewId, id));
    await db.delete(reviewVotes).where(eq(reviewVotes.reviewId, id));

    await recomputeAggregate(review.targetType, review.targetId);
    revalidateTag("reviews", "max");
    await writeAudit({
      userId: user.id,
      action: "review.delete",
      ownerType: "review",
      ownerId: id,
      meta: { personId: review.personId, targetType: review.targetType, targetId: review.targetId },
    });
    return ok();
  });
}

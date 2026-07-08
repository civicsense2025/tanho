"use server";

import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { writeAudit } from "@/modules/audit/log";
import { getViewer } from "@/modules/people/viewer";
import { personActivity } from "@/modules/people/schema";
import { reviews, reviewVotes } from "./schema";
import { reviewSubmitSchema } from "./validation";
import {
  computeVerified,
  getReview,
  getReviewTargetConfig,
  hasExistingReview,
  recomputeAggregate,
} from "./queries";
import { allowReviewSubmission } from "./rate-limit";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const invalidate = (targetType: string, targetId: string) => {
  updateTag("reviews");
  updateTag(`reviews:${targetType}:${targetId}`);
};

/**
 * Public: submit a review. Enforces target enabled, login required,
 * per-target+IP rate limit, one-review-per-person, rating bounds, verified
 * gate, and moderation policy. Writes a person_activity row and recomputes the
 * aggregate when the review lands as approved.
 */
export async function submitReview(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = reviewSubmitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid review" };
  }
  const { targetType, targetId, rating, title, body, photos, meta } = parsed.data;

  const config = await getReviewTargetConfig(targetType);
  if (!config.enabled) return { ok: false, error: "Reviews are disabled for this content." };

  const viewer = await getViewer();
  if (!viewer) {
    return { ok: false, error: "Please sign in to leave a review." };
  }

  const hdrs = await headers();
  const ip = (hdrs.get("x-forwarded-for") ?? "local").split(",")[0]!.trim();
  if (!(await allowReviewSubmission(targetType, targetId, ip))) {
    return { ok: false, error: "Too many reviews. Try again in a few minutes." };
  }

  if (await hasExistingReview(viewer.personId, targetType, targetId)) {
    return { ok: false, error: "You've already reviewed this. Edit your existing review instead." };
  }

  if (config.allowRating) {
    if (rating < config.minRating || rating > config.maxRating) {
      return { ok: false, error: `Rating must be between ${config.minRating} and ${config.maxRating}.` };
    }
  } else if (rating !== 0) {
    return { ok: false, error: "This content accepts comments only, not star ratings." };
  }

  const verified = await computeVerified(viewer.personId, targetType, targetId);
  if (config.verifiedGate === "required" && !verified.verified) {
    const noun = targetType === "product" ? "purchase" : "enrollment";
    return { ok: false, error: `Only verified ${noun}s can review this content.` };
  }

  const status = config.moderation === "pre" ? "pending" : "approved";

  const [row] = await db
    .insert(reviews)
    .values({
      targetType,
      targetId,
      personId: viewer.personId,
      rating,
      title,
      body,
      photos,
      meta,
      status,
      verified: verified.verified,
      verifiedMethod: verified.method,
      verifiedRef: verified.ref ?? null,
      source: "web",
      updatedAt: Date.now(),
    })
    .returning({ id: reviews.id });

  await db.insert(personActivity).values({
    personId: viewer.personId,
    type: "review",
    label: title || body.slice(0, 80) || `Review of ${targetType}:${targetId}`,
    meta: { targetType, targetId, rating, reviewId: row.id, status },
  });

  await writeAudit({
    userId: null,
    action: "review.submit",
    ownerType: "review",
    ownerId: row.id,
    meta: { targetType, targetId, personId: viewer.personId, status, verified: verified.verified },
  });

  if (status === "approved") await recomputeAggregate(targetType, targetId);
  invalidate(targetType, targetId);
  return { ok: true, data: { id: row.id } };
}

/**
 * Public: toggle the current viewer's helpful vote on a review. Idempotent —
 * a second call removes the vote. Only approved reviews are votable.
 */
export async function voteReview(reviewId: string): Promise<Result<{ voted: boolean }>> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Please sign in to vote." };

  const review = await getReview(reviewId);
  if (!review || review.status !== "approved") {
    return { ok: false, error: "Review not found." };
  }

  const existing = await db.query.reviewVotes.findFirst({
    where: and(eq(reviewVotes.reviewId, reviewId), eq(reviewVotes.personId, viewer.personId)),
  });
  if (existing) {
    await db
      .delete(reviewVotes)
      .where(and(eq(reviewVotes.reviewId, reviewId), eq(reviewVotes.personId, viewer.personId)));
    await db
      .update(reviews)
      .set({ helpfulVotes: Math.max(0, review.helpfulVotes - 1) })
      .where(eq(reviews.id, reviewId));
    return { ok: true, data: { voted: false } };
  }

  await db.insert(reviewVotes).values({ reviewId, personId: viewer.personId });
  await db
    .update(reviews)
    .set({ helpfulVotes: review.helpfulVotes + 1 })
    .where(eq(reviews.id, reviewId));
  return { ok: true, data: { voted: true } };
}

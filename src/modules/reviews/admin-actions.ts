"use server";

import { updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import {
  reviews,
  reviewReplies,
  reviewTargets,
} from "./schema";
import {
  reviewImportRowSchema,
  reviewModerateSchema,
  reviewReplySchema,
  reviewTargetConfigSchema,
} from "./validation";
import { getReview, recomputeAggregate } from "./queries";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const invalidate = (targetType: string, targetId: string) => {
  updateTag("reviews");
  updateTag(`reviews:${targetType}:${targetId}`);
};

/** Admin: approve a pending/rejected review. */
export async function approveReview(id: string): Promise<Result> {
  const user = await requireUser();
  const review = await getReview(id);
  if (!review) return { ok: false, error: "Review not found." };

  await db
    .update(reviews)
    .set({ status: "approved", updatedAt: Date.now() })
    .where(eq(reviews.id, id));

  await writeAudit({ userId: user.id, action: "review.approve", ownerType: "review", ownerId: id });
  await recomputeAggregate(review.targetType, review.targetId);
  invalidate(review.targetType, review.targetId);
  return { ok: true };
}

/** Admin: reject a pending review (hidden from public, kept for audit). */
export async function rejectReview(id: string, input: unknown): Promise<Result> {
  const user = await requireUser();
  const review = await getReview(id);
  if (!review) return { ok: false, error: "Review not found." };

  const parsed = reviewModerateSchema.safeParse(input ?? {});
  const note = parsed.success ? parsed.data.note : "";

  await db
    .update(reviews)
    .set({ status: "rejected", moderationNote: note, updatedAt: Date.now() })
    .where(eq(reviews.id, id));

  await writeAudit({ userId: user.id, action: "review.reject", ownerType: "review", ownerId: id, meta: { note } });
  await recomputeAggregate(review.targetType, review.targetId);
  invalidate(review.targetType, review.targetId);
  return { ok: true };
}

/** Admin: hide an approved review (e.g. after a complaint). */
export async function hideReview(id: string, input: unknown): Promise<Result> {
  const user = await requireUser();
  const review = await getReview(id);
  if (!review) return { ok: false, error: "Review not found." };

  const parsed = reviewModerateSchema.safeParse(input ?? {});
  const note = parsed.success ? parsed.data.note : "";

  await db
    .update(reviews)
    .set({ status: "hidden", moderationNote: note, updatedAt: Date.now() })
    .where(eq(reviews.id, id));

  await writeAudit({ userId: user.id, action: "review.hide", ownerType: "review", ownerId: id, meta: { note } });
  await recomputeAggregate(review.targetType, review.targetId);
  invalidate(review.targetType, review.targetId);
  return { ok: true };
}

/** Admin: upsert an owner reply to a review (one reply per review). */
export async function replyToReview(id: string, input: unknown): Promise<Result> {
  const user = await requireUser();
  const review = await getReview(id);
  if (!review) return { ok: false, error: "Review not found." };

  const parsed = reviewReplySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid reply" };
  }

  const existing = await db.query.reviewReplies.findFirst({ where: eq(reviewReplies.reviewId, id) });
  if (existing) {
    await db
      .update(reviewReplies)
      .set({ body: parsed.data.body, byUserId: user.id, updatedAt: Date.now() })
      .where(eq(reviewReplies.reviewId, id));
  } else {
    await db.insert(reviewReplies).values({
      reviewId: id,
      body: parsed.data.body,
      byUserId: user.id,
    });
  }

  await writeAudit({ userId: user.id, action: "review.reply", ownerType: "review", ownerId: id });
  invalidate(review.targetType, review.targetId);
  return { ok: true };
}

/** Admin: delete the owner reply on a review. */
export async function deleteReply(id: string): Promise<Result> {
  const user = await requireUser();
  const review = await getReview(id);
  if (!review) return { ok: false, error: "Review not found." };

  await db.delete(reviewReplies).where(eq(reviewReplies.reviewId, id));
  await writeAudit({ userId: user.id, action: "review.reply.delete", ownerType: "review", ownerId: id });
  invalidate(review.targetType, review.targetId);
  return { ok: true };
}

/** Admin: upsert per-target-type config (creates the row on first customize). */
export async function setReviewTargetConfig(input: unknown): Promise<Result> {
  const user = await requireUser();
  const parsed = reviewTargetConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid config" };
  }
  const { targetType, ...rest } = parsed.data;

  await db
    .insert(reviewTargets)
    .values({ targetType, ...rest, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: reviewTargets.targetType,
      set: { ...rest, updatedAt: Date.now() },
    });

  await writeAudit({
    userId: user.id,
    action: "review.target.config",
    ownerType: "review-target",
    ownerId: targetType,
    meta: rest,
  });
  updateTag("reviews");
  return { ok: true };
}

/**
 * Admin: bulk import reviews (migration tooling). Imported rows land as
 * approved with the verified flag carried from the import row. Bypasses the
 * rate limit and one-per-person guard (migration is trusted admin input).
 */
export async function importReviews(rows: unknown[]): Promise<Result<{ inserted: number }>> {
  const user = await requireUser();
  let inserted = 0;
  for (const raw of rows) {
    const parsed = reviewImportRowSchema.safeParse(raw);
    if (!parsed.success) continue;
    const r = parsed.data;
    try {
      await db.insert(reviews).values({
        targetType: r.targetType,
        targetId: r.targetId,
        personId: r.personId,
        rating: r.rating,
        title: r.title,
        body: r.body,
        status: "approved",
        verified: r.verified,
        verifiedMethod: r.verifiedMethod,
        verifiedRef: r.verifiedRef ?? null,
        source: "import",
        at: r.at ?? Date.now(),
        updatedAt: Date.now(),
      });
      inserted++;
    } catch {
      // Skip duplicates / bad rows — import is best-effort.
    }
  }

  await writeAudit({
    userId: user.id,
    action: "review.import",
    ownerType: "review",
    ownerId: "bulk",
    meta: { inserted, attempted: rows.length },
  });
  updateTag("reviews");
  return { ok: true, data: { inserted } };
}

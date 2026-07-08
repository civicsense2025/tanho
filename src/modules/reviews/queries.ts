import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orders, orderItems } from "@/modules/commerce/schema";
import { people } from "@/modules/people/schema";
import {
  reviewAggregates,
  reviewReplies,
  reviewTargets,
  reviewVotes,
  reviews,
} from "./schema";
import type { ReviewSort } from "./validation";

export type {
  ReviewRow,
  ReviewReplyRow,
  ReviewTargetRow,
  ReviewAggregateRow,
  ReviewVoteRow,
} from "./schema";

/** A review with its owner reply + reviewer display fields, for list UIs. */
export type ReviewWithMeta = {
  id: string;
  targetType: string;
  targetId: string;
  personId: string;
  rating: number;
  title: string;
  body: string;
  photos: string[];
  status: "pending" | "approved" | "rejected" | "hidden";
  verified: boolean;
  verifiedMethod: "order" | "enrollment" | "membership" | "none";
  verifiedRef: string | null;
  helpfulVotes: number;
  meta: Record<string, unknown>;
  source: "web" | "email" | "api" | "import";
  at: number;
  updatedAt: number;
  /** Reviewer display name (joined from people). */
  reviewerName: string;
  /** Owner reply if any. */
  reply: { body: string; at: number } | null;
  /** Whether the current viewer (by personId) has voted helpful. */
  viewerVoted: boolean;
};

export type ReviewTargetConfig = {
  targetType: string;
  enabled: boolean;
  moderation: "pre" | "post";
  verifiedGate: "required" | "optional";
  requireLogin: boolean;
  allowRating: boolean;
  minRating: number;
  maxRating: number;
};

/** The config applied when no `review_targets` row exists for a type. */
export const DEFAULT_REVIEW_TARGET_CONFIG: Omit<ReviewTargetConfig, "targetType"> = {
  enabled: true,
  moderation: "post",
  verifiedGate: "optional",
  requireLogin: true,
  // Ratings are managed in the federated hub marketplace; local content reviews
  // default to comment-only.
  allowRating: false,
  minRating: 0,
  maxRating: 5,
};

/** Resolved config for a target type — DB row or the documented defaults. */
export async function getReviewTargetConfig(
  targetType: string,
): Promise<ReviewTargetConfig> {
  const row = await db.query.reviewTargets.findFirst({
    where: eq(reviewTargets.targetType, targetType),
  });
  if (!row) return { ...DEFAULT_REVIEW_TARGET_CONFIG, targetType };
  return {
    targetType: row.targetType,
    enabled: row.enabled,
    moderation: row.moderation,
    verifiedGate: row.verifiedGate,
    requireLogin: row.requireLogin,
    allowRating: row.allowRating,
    minRating: row.minRating,
    maxRating: row.maxRating,
  };
}

/** One review by id (raw row). */
export async function getReview(id: string) {
  return db.query.reviews.findFirst({ where: eq(reviews.id, id) });
}

/** The owner's reply to a review, if any. */
export async function getOwnerReply(reviewId: string) {
  return db.query.reviewReplies.findFirst({ where: eq(reviewReplies.reviewId, reviewId) });
}

/** Has this person already reviewed this target? (One-per-person enforcement.) */
export async function hasExistingReview(
  personId: string,
  targetType: string,
  targetId: string,
): Promise<boolean> {
  const row = await db.query.reviews.findFirst({
    where: and(
      eq(reviews.personId, personId),
      eq(reviews.targetType, targetType),
      eq(reviews.targetId, targetId),
    ),
    columns: { id: true },
  });
  return !!row;
}

/**
 * Verified-purchase computation. Reviews are products-only (migration 0034),
 * so verification is always an order lookup: does this person have a paid or
 * fulfilled order containing this product?
 *
 * The `enrollment`/`membership` enum values remain for import-row compat, but
 * are no longer returned for new submissions — a course review is verified by
 * the course product's order, same as any other product.
 */
export async function computeVerified(
  personId: string,
  targetType: string,
  targetId: string,
): Promise<{
  verified: boolean;
  method: "order" | "enrollment" | "membership" | "none";
  ref?: string;
}> {
  // Reviews are products-only; targetType is always "product" for new
  // submissions. We keep the targetType param for API stability and still
  // handle the (now-migrated-out) non-product case by returning not-verified.
  if (targetType !== "product") {
    return { verified: false, method: "none" };
  }
  // Order with this product, paid or fulfilled, linked to this person.
  const [hit] = await db
    .select({ orderId: orders.id })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.personId, personId),
        eq(orderItems.productId, targetId),
        inArray(orders.status, ["paid", "fulfilled"]),
      ),
    )
    .limit(1);
  if (hit) return { verified: true, method: "order", ref: hit.orderId };
  return { verified: false, method: "none" };
}

/**
 * Public + admin list for a target. `viewerPersonId` controls the
 * `viewerVoted` flag on each row; pass undefined when no viewer context.
 * Status filter defaults to "approved" for public reads; admin passes undefined
 * to see all statuses.
 */
export async function listReviewsForTarget(
  targetType: string,
  targetId: string,
  opts: {
    status?: "pending" | "approved" | "rejected" | "hidden";
    sort?: ReviewSort;
    limit?: number;
    offset?: number;
    viewerPersonId?: string;
  } = {},
): Promise<ReviewWithMeta[]> {
  const status = opts.status ?? "approved";
  const sort = opts.sort ?? "recent";
  const limit = Math.min(opts.limit ?? 50, 100);
  const offset = opts.offset ?? 0;

  const rows = await db.query.reviews.findMany({
    where: and(
      eq(reviews.targetType, targetType),
      eq(reviews.targetId, targetId),
      status ? eq(reviews.status, status) : undefined,
    ),
    orderBy:
      sort === "highest"
        ? [desc(reviews.rating), desc(reviews.at)]
        : sort === "lowest"
          ? [reviews.rating, desc(reviews.at)]
          : sort === "helpful"
            ? [desc(reviews.helpfulVotes), desc(reviews.at)]
            : [desc(reviews.at)],
    limit,
    offset,
  });

  if (rows.length === 0) return [];

  const reviewIds = rows.map((r) => r.id);
  const personIds = [...new Set(rows.map((r) => r.personId))];

  const [replyRows, peopleRows, voteRows] = await Promise.all([
    db.query.reviewReplies.findMany({ where: inArray(reviewReplies.reviewId, reviewIds) }),
    db.query.people.findMany({ where: inArray(people.id, personIds), columns: { id: true, name: true } }),
    opts.viewerPersonId
      ? db.query.reviewVotes.findMany({
        where: and(inArray(reviewVotes.reviewId, reviewIds), eq(reviewVotes.personId, opts.viewerPersonId)),
      })
      : Promise.resolve([]),
  ]);

  const replyByReview = new Map(replyRows.map((r) => [r.reviewId, r]));
  const nameByPerson = new Map(peopleRows.map((p) => [p.id, p.name]));
  const votedSet = new Set(voteRows.map((v) => v.reviewId));

  return rows.map((r) => ({
    id: r.id,
    targetType: r.targetType,
    targetId: r.targetId,
    personId: r.personId,
    rating: r.rating,
    title: r.title,
    body: r.body,
    photos: r.photos,
    status: r.status,
    verified: r.verified,
    verifiedMethod: r.verifiedMethod,
    verifiedRef: r.verifiedRef,
    helpfulVotes: r.helpfulVotes,
    meta: r.meta,
    source: r.source,
    at: r.at,
    updatedAt: r.updatedAt,
    reviewerName: nameByPerson.get(r.personId) ?? "Anonymous",
    reply: replyByReview.has(r.id)
      ? { body: replyByReview.get(r.id)!.body, at: replyByReview.get(r.id)!.at }
      : null,
    viewerVoted: votedSet.has(r.id),
  }));
}

/** Admin moderation queue — pending first, then newest. Optional target filter. */
export async function listPendingReviews(targetType?: string) {
  return db.query.reviews.findMany({
    where: and(
      eq(reviews.status, "pending"),
      targetType ? eq(reviews.targetType, targetType) : undefined,
    ),
    orderBy: [desc(reviews.at)],
    limit: 200,
  });
}

/** All reviews by a person (any status — used in the person's activity admin view). */
export async function listReviewsByPerson(personId: string) {
  return db.query.reviews.findMany({
    where: eq(reviews.personId, personId),
    orderBy: [desc(reviews.at)],
    limit: 100,
  });
}

/** Cached aggregate for a target (null if never computed). */
export async function getReviewAggregate(targetType: string, targetId: string) {
  return db.query.reviewAggregates.findFirst({
    where: and(eq(reviewAggregates.targetType, targetType), eq(reviewAggregates.targetId, targetId)),
  });
}

/**
 * Recompute and upsert the cached aggregate for a target from its APPROVED
 * reviews only. Called on every review status change. Rating-0 (comment-only)
 * reviews are excluded from the average but counted in the total.
 */
export async function recomputeAggregate(targetType: string, targetId: string): Promise<void> {
  const rows = await db.query.reviews.findMany({
    where: and(
      eq(reviews.targetType, targetType),
      eq(reviews.targetId, targetId),
      eq(reviews.status, "approved"),
    ),
    columns: { rating: true },
  });

  const starred = rows.filter((r) => r.rating > 0);
  const distribution = [0, 0, 0, 0, 0];
  for (const r of starred) {
    if (r.rating >= 1 && r.rating <= 5) distribution[r.rating - 1]++;
  }
  const average =
    starred.length > 0 ? starred.reduce((s, r) => s + r.rating, 0) / starred.length : 0;

  await db
    .insert(reviewAggregates)
    .values({
      targetType,
      targetId,
      average: Math.round(average * 10) / 10,
      count: rows.length,
      distribution,
      computedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: [reviewAggregates.targetType, reviewAggregates.targetId],
      set: {
        average: Math.round(average * 10) / 10,
        count: rows.length,
        distribution,
        computedAt: Date.now(),
      },
    });
}

/** Public aggregate shape for the block resolver + API (null-safe). */
export type ReviewAggregateSummary = {
  average: number;
  count: number;
  distribution: number[];
};

/** Read the cached aggregate, or compute-on-demand if missing. */
export async function getOrComputeAggregate(
  targetType: string,
  targetId: string,
): Promise<ReviewAggregateSummary> {
  const cached = await getReviewAggregate(targetType, targetId);
  if (cached) return { average: cached.average, count: cached.count, distribution: cached.distribution };
  await recomputeAggregate(targetType, targetId);
  const fresh = await getReviewAggregate(targetType, targetId);
  return fresh
    ? { average: fresh.average, count: fresh.count, distribution: fresh.distribution }
    : { average: 0, count: 0, distribution: [0, 0, 0, 0, 0] };
}

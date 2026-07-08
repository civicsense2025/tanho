import { getViewer } from "@/modules/people/viewer";
import {
  getOrComputeAggregate,
  getReviewTargetConfig,
  listReviewsForTarget,
  type ReviewAggregateSummary,
  type ReviewTargetConfig,
  type ReviewWithMeta,
} from "@/modules/reviews/queries";
import type { ReviewsContent } from "./fields";

/** The resolver result handed to Render as `content._resolved`. */
export type ReviewsResolved = {
  reviews: ReviewWithMeta[];
  aggregate: ReviewAggregateSummary;
  config: ReviewTargetConfig;
  /** The current viewer's personId (null = anonymous) — for the submit form's gate. */
  viewerPersonId: string | null;
  viewerName: string | null;
};

/**
 * Server-only: resolve the bound target's approved reviews, aggregate, config,
 * and the current viewer. Returns null when targetType/targetId is empty (a
 * mis-placed block) so Render draws nothing rather than crashing. Called from
 * the public page render (a Server Component), so getViewer() — which reads
 * the person_session cookie via next/headers — is callable here.
 */
export async function resolveReviews(content: ReviewsContent): Promise<ReviewsResolved | null> {
  const targetType = content.targetType.trim();
  const targetId = content.targetId.trim();
  if (!targetType || !targetId) return null;

  const config = await getReviewTargetConfig(targetType);
  const viewer = await getViewer();
  const [reviewRows, aggregate] = await Promise.all([
    listReviewsForTarget(targetType, targetId, {
      status: "approved",
      sort: content.sortBy,
      limit: content.limit,
      viewerPersonId: viewer?.personId,
    }),
    getOrComputeAggregate(targetType, targetId),
  ]);

  return {
    reviews: reviewRows,
    aggregate,
    config,
    viewerPersonId: viewer?.personId ?? null,
    viewerName: viewer?.name ?? null,
  };
}

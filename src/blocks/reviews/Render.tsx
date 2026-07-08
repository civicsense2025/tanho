import type { RenderCtx } from "../types";
import { boundPlaceholder } from "../bound-common";
import type { ReviewsContent } from "./fields";
import type { ReviewsResolved } from "./resolve";
import { ReviewsRenderer } from "@/modules/reviews/public/ReviewsRenderer";

/**
 * Reviews block — pure presentation. resolve() loads approved reviews +
 * aggregate + config + viewer (server-only); this delegates to the client
 * `ReviewsRenderer` for interactive submit / vote / sort. In the editor (or
 * when the block is mis-placed so resolve returned null) it shows a neutral
 * placeholder rather than an interactive widget.
 */
export function RenderReviews({
  content,
  ctx,
}: {
  content: ReviewsContent & { _resolved?: ReviewsResolved | null };
  ctx: RenderCtx;
}) {
  const ph = boundPlaceholder(ctx, "Reviews", content._resolved);
  if (ph) return <div style={ph.style}>{ph.label}</div>;

  const resolved = content._resolved;
  if (!resolved) return null;
  if (!resolved.config.enabled) return null;
  if (resolved.reviews.length === 0 && !content.showForm) return null;

  return (
    <ReviewsRenderer
      targetType={content.targetType}
      targetId={content.targetId}
      reviews={resolved.reviews}
      aggregate={resolved.aggregate}
      config={resolved.config}
      viewerPersonId={resolved.viewerPersonId}
      viewerName={resolved.viewerName}
      showSummary={content.showSummary}
      showForm={content.showForm}
      showDistribution={content.showDistribution}
      sortBy={content.sortBy}
      limit={content.limit}
    />
  );
}

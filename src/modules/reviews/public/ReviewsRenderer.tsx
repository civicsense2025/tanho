"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  ReviewAggregateSummary,
  ReviewTargetConfig,
  ReviewWithMeta,
} from "@/modules/reviews/queries";
import type { ReviewSort } from "@/modules/reviews/validation";
import { voteReview } from "@/modules/reviews/actions";
import { ReviewForm } from "./ReviewForm";
import { ReviewCard } from "./ReviewCard";

/**
 * Interactive reviews widget for a reviewable target — summary + filter/sort
 * bar + list + submit form + helpful votes. Server-rendered shell from the
 * reviews block resolver; this client island handles submit, vote, sort, and
 * "load more". Schema.org AggregateRating + Review JSON-LD is emitted in a
 * script tag so rich snippets work even though the list itself is interactive.
 */
export function ReviewsRenderer({
  targetType,
  targetId,
  reviews: initialReviews,
  aggregate,
  config,
  viewerPersonId,
  viewerName,
  showSummary,
  showForm,
  showDistribution,
  sortBy: initialSort,
  limit,
}: {
  targetType: string;
  targetId: string;
  reviews: ReviewWithMeta[];
  aggregate: ReviewAggregateSummary;
  config: ReviewTargetConfig;
  viewerPersonId: string | null;
  viewerName: string | null;
  showSummary: boolean;
  showForm: boolean;
  showDistribution: boolean;
  sortBy: ReviewSort;
  limit: number;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [sort, setSort] = useState<ReviewSort>(initialSort);
  const [showFormPanel, setShowFormPanel] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const sorted = useMemo(() => {
    const copy = [...reviews];
    if (sort === "highest") copy.sort((a, b) => b.rating - a.rating || b.at - a.at);
    else if (sort === "lowest") copy.sort((a, b) => a.rating - b.rating || b.at - a.at);
    else if (sort === "helpful") copy.sort((a, b) => b.helpfulVotes - a.helpfulVotes || b.at - a.at);
    else copy.sort((a, b) => b.at - a.at);
    return copy.slice(0, limit);
  }, [reviews, sort, limit]);

  const onSubmitted = useCallback((res: { ok: boolean; error?: string; id?: string }) => {
    if (res.ok) {
      setSubmitMsg({ ok: true, text: "Thanks! Your review has been submitted." });
      setShowFormPanel(false);
    } else {
      setSubmitMsg({ ok: false, text: res.error ?? "Something went wrong." });
    }
  }, []);

  const onVote = useCallback(
    async (reviewId: string) => {
      if (!viewerPersonId) return;
      const res = await voteReview(reviewId);
      if (!res.ok) return;
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? {
              ...r,
              helpfulVotes: res.data!.voted ? r.helpfulVotes + 1 : Math.max(0, r.helpfulVotes - 1),
              viewerVoted: res.data!.voted,
            }
            : r,
        ),
      );
    },
    [viewerPersonId],
  );

  const jsonLd = aggregate.count > 0
    ? {
      "@context": "https://schema.org",
      "@type": "AggregateRating",
      ratingValue: aggregate.average,
      reviewCount: aggregate.count,
      bestRating: config.maxRating,
      worstRating: config.minRating,
    }
    : null;

  return (
    <section className="reviews" aria-label="Reviews">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {showSummary && aggregate.count > 0 && (
        <ReviewsSummary aggregate={aggregate} config={config} showDistribution={showDistribution} />
      )}

      {showForm && (
        <div className="reviews-submit">
          {viewerPersonId ? (
            showFormPanel ? (
              <ReviewForm
                targetType={targetType}
                targetId={targetId}
                config={config}
                viewerName={viewerName}
                onSubmitted={onSubmitted}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowFormPanel(true)}
                className="reviews-write-btn"
              >
                Write a review
              </button>
            )
          ) : (
            <p className="reviews-signin-nudge">
              <a href={`/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}>
                Sign in
              </a>{" "}
              to write a review.
            </p>
          )}
          {submitMsg && (
            <p className={submitMsg.ok ? "reviews-ok" : "reviews-error"} role="status">
              {submitMsg.text}
            </p>
          )}
        </div>
      )}

      {sorted.length > 0 && (
        <>
          <ReviewsToolbar sort={sort} onSort={setSort} count={sorted.length} />
          <ul className="reviews-list">
            {sorted.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                viewerPersonId={viewerPersonId}
                onVote={onVote}
              />
            ))}
          </ul>
        </>
      )}

      {aggregate.count === 0 && !showForm && (
        <p className="reviews-empty">No reviews yet.</p>
      )}

      <style>{STYLES}</style>
    </section>
  );
}

function ReviewsSummary({
  aggregate,
  config,
  showDistribution,
}: {
  aggregate: ReviewAggregateSummary;
  config: ReviewTargetConfig;
  showDistribution: boolean;
}) {
  return (
    <div className="reviews-summary">
      <div className="reviews-summary-score">
        <span className="reviews-summary-average">{aggregate.average.toFixed(1)}</span>
        <Stars value={aggregate.average} max={config.maxRating} />
        <span className="reviews-summary-count">{aggregate.count} review{aggregate.count === 1 ? "" : "s"}</span>
      </div>
      {showDistribution && config.allowRating && (
        <div className="reviews-distribution">
          {aggregate.distribution.map((c, i) => {
            const star = config.maxRating - i;
            const pct = aggregate.count > 0 ? (c / aggregate.count) * 100 : 0;
            return (
              <div key={star} className="reviews-dist-row">
                <span className="reviews-dist-label">{star}★</span>
                <div className="reviews-dist-bar">
                  <div className="reviews-dist-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="reviews-dist-count">{c}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReviewsToolbar({
  sort,
  onSort,
  count,
}: {
  sort: ReviewSort;
  onSort: (s: ReviewSort) => void;
  count: number;
}) {
  return (
    <div className="reviews-toolbar">
      <span className="reviews-toolbar-count">{count} review{count === 1 ? "" : "s"}</span>
      <label className="reviews-sort">
        Sort:
        <select value={sort} onChange={(e) => onSort(e.target.value as ReviewSort)}>
          <option value="recent">Most recent</option>
          <option value="helpful">Most helpful</option>
          <option value="highest">Highest rated</option>
          <option value="lowest">Lowest rated</option>
        </select>
      </label>
    </div>
  );
}

export function Stars({ value, max = 5 }: { value: number; max?: number }) {
  const clamped = Math.max(0, Math.min(max, value));
  return (
    <span className="reviews-stars" aria-hidden="true">
      {Array.from({ length: max }, (_, i) => {
        const fill = Math.max(0, Math.min(1, clamped - i));
        return (
          <span key={i} className="reviews-star">
            ☆
            <span className="reviews-star-fill" style={{ width: `${fill * 100}%` }}>★</span>
          </span>
        );
      })}
    </span>
  );
}

const STYLES = `
.reviews { display: flex; flex-direction: column; gap: var(--space-4); }
.reviews-summary { display: flex; gap: var(--space-6); align-items: center; flex-wrap: wrap; padding: var(--space-4); border: 1px solid var(--border); border-radius: var(--radius-md); }
.reviews-summary-score { display: flex; flex-direction: column; gap: var(--space-1); align-items: flex-start; }
.reviews-summary-average { font-size: var(--text-3xl); font-weight: 700; line-height: 1; }
.reviews-summary-count { font-size: var(--text-sm); color: var(--text-muted); }
.reviews-distribution { display: flex; flex-direction: column; gap: var(--space-1); flex: 1; min-width: 200px; }
.reviews-dist-row { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); }
.reviews-dist-label { width: 2rem; color: var(--text-muted); }
.reviews-dist-bar { flex: 1; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
.reviews-dist-fill { height: 100%; background: var(--accent); }
.reviews-dist-count { width: 2rem; text-align: right; color: var(--text-muted); }
.reviews-submit { display: flex; flex-direction: column; gap: var(--space-2); }
.reviews-write-btn { align-self: flex-start; padding: var(--space-2) var(--space-4); border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--surface); cursor: pointer; font-size: var(--text-sm); }
.reviews-write-btn:hover { border-color: var(--accent); }
.reviews-signin-nudge { font-size: var(--text-sm); color: var(--text-muted); }
.reviews-signin-nudge a { color: var(--accent); }
.reviews-ok { color: var(--accent); font-size: var(--text-sm); }
.reviews-error { color: var(--danger); font-size: var(--text-sm); }
.reviews-toolbar { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); }
.reviews-toolbar-count { font-size: var(--text-sm); color: var(--text-muted); }
.reviews-sort { display: flex; gap: var(--space-2); align-items: center; font-size: var(--text-sm); }
.reviews-sort select { padding: var(--space-1) var(--space-2); border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); }
.reviews-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-4); }
.reviews-empty { color: var(--text-faint); font-size: var(--text-sm); }
.reviews-stars { display: inline-flex; position: relative; color: var(--text-faint); letter-spacing: 1px; }
.reviews-star { position: relative; display: inline-block; }
.reviews-star-fill { position: absolute; inset-block: 0; inset-inline-start: 0; overflow: hidden; color: var(--accent); }
`;

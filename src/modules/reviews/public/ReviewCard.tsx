"use client";

import { useState } from "react";
import type { ReviewWithMeta } from "@/modules/reviews/queries";
import { Stars } from "./ReviewsRenderer";

/** One review card: stars, verified badge, title, body, photos, owner reply, helpful vote. */
export function ReviewCard({
  review,
  viewerPersonId,
  onVote,
}: {
  review: ReviewWithMeta;
  viewerPersonId: string | null;
  onVote: (reviewId: string) => void;
}) {
  const [voting, setVoting] = useState(false);
  const date = new Date(review.at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const handleVote = async () => {
    if (!viewerPersonId || voting || review.viewerVoted) return;
    setVoting(true);
    await onVote(review.id);
    setVoting(false);
  };

  return (
    <li className="review-card">
      <div className="review-card-head">
        <div className="review-card-author">
          <strong>{review.reviewerName}</strong>
          {review.verified && (
            <span className="review-verified-badge" title={`Verified via ${review.verifiedMethod}`}>
              ✓ Verified
            </span>
          )}
          <span className="review-card-date">{date}</span>
        </div>
        {review.rating > 0 && <Stars value={review.rating} />}
      </div>

      {review.title && <h4 className="review-card-title">{review.title}</h4>}
      {review.body && <p className="review-card-body">{review.body}</p>}

      {review.photos.length > 0 && (
        <div className="review-card-photos">
          {review.photos.map((id) => (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic media-served photos, no fixed dimensions for next/image
            <img key={id} src={`/api/media/${id}`} alt="Customer photo" loading="lazy" />
          ))}
        </div>
      )}

      {review.reply && (
        <div className="review-reply">
          <span className="review-reply-label">Owner response</span>
          <p>{review.reply.body}</p>
        </div>
      )}

      <div className="review-card-foot">
        <button
          type="button"
          onClick={handleVote}
          disabled={!viewerPersonId || voting || review.viewerVoted}
          className="review-vote-btn"
          aria-label="Mark as helpful"
        >
          Helpful ({review.helpfulVotes})
        </button>
      </div>

      <style>{STYLES}</style>
    </li>
  );
}

const STYLES = `
.review-card { padding: var(--space-4); border: 1px solid var(--border); border-radius: var(--radius-md); display: flex; flex-direction: column; gap: var(--space-2); }
.review-card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); }
.review-card-author { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; font-size: var(--text-sm); }
.review-verified-badge { background: var(--accent); color: var(--surface); padding: 1px var(--space-2); border-radius: var(--radius-sm); font-size: var(--text-xs); font-weight: 600; }
.review-card-date { color: var(--text-faint); font-size: var(--text-xs); }
.review-card-title { margin: 0; font-size: var(--text-base); font-weight: 600; }
.review-card-body { margin: 0; font-size: var(--text-sm); line-height: 1.6; color: var(--text); }
.review-card-photos { display: flex; gap: var(--space-2); flex-wrap: wrap; }
.review-card-photos img { width: 80px; height: 80px; object-fit: cover; border-radius: var(--radius-sm); border: 1px solid var(--border); }
.review-reply { margin-top: var(--space-2); padding: var(--space-3); background: var(--surface-alt); border-radius: var(--radius-sm); border-inline-start: 3px solid var(--accent); }
.review-reply-label { font-size: var(--text-xs); font-weight: 600; color: var(--accent); display: block; margin-bottom: var(--space-1); }
.review-reply p { margin: 0; font-size: var(--text-sm); }
.review-card-foot { display: flex; gap: var(--space-3); }
.review-vote-btn { background: none; border: none; color: var(--text-muted); font-size: var(--text-xs); cursor: pointer; padding: var(--space-1); }
.review-vote-btn:hover:not(:disabled) { color: var(--accent); }
.review-vote-btn:disabled { cursor: default; opacity: 0.7; }
`;

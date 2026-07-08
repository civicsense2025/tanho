"use client";

import { useState } from "react";
import { submitReview } from "@/modules/reviews/actions";
import type { ReviewTargetConfig } from "@/modules/reviews/queries";

/**
 * Review submission form. Calls the `submitReview` server action and surfaces
 * the result. The rating input is shown only when `config.allowRating` is
 * true; comment-only targets (Patreon-style) skip the stars entirely.
 */
export function ReviewForm({
  targetType,
  targetId,
  config,
  viewerName,
  onSubmitted,
}: {
  targetType: string;
  targetId: string;
  config: ReviewTargetConfig;
  viewerName: string | null;
  onSubmitted: (res: { ok: boolean; error?: string; id?: string }) => void;
}) {
  const [rating, setRating] = useState(config.allowRating ? config.minRating : 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const res = await submitReview({ targetType, targetId, rating, title, body, photos: [], meta: {} });
    setSubmitting(false);
    onSubmitted(res.ok ? { ok: true, id: res.data?.id } : { ok: false, error: res.error });
  };

  return (
    <form onSubmit={submit} className="review-form">
      <h4 className="review-form-heading">Write a review{viewerName ? ` as ${viewerName}` : ""}</h4>

      {config.allowRating && (
        <div className="review-form-rating">
          <label>Rating:</label>
          <div className="review-form-stars" onMouseLeave={() => setHoverRating(0)}>
            {Array.from({ length: config.maxRating }, (_, i) => {
              const value = i + 1;
              const active = hoverRating || rating;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoverRating(value)}
                  className="review-form-star-btn"
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                >
                  <span className={value <= active ? "review-form-star-on" : "review-form-star-off"}>★</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <label className="review-form-field">
        Title
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 120))}
          maxLength={120}
          placeholder="Sum up your experience"
          className="review-form-input"
        />
      </label>

      <label className="review-form-field">
        Review
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 5000))}
          maxLength={5000}
          rows={5}
          placeholder="What did you like? What could be better?"
          className="review-form-textarea"
          required
        />
      </label>

      <div className="review-form-actions">
        <button type="submit" disabled={submitting} className="review-form-submit">
          {submitting ? "Submitting…" : "Submit review"}
        </button>
      </div>

      <style>{STYLES}</style>
    </form>
  );
}

const STYLES = `
.review-form { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4); border: 1px solid var(--border); border-radius: var(--radius-md); }
.review-form-heading { margin: 0; font-size: var(--text-base); font-weight: 600; }
.review-form-rating { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); }
.review-form-stars { display: inline-flex; gap: 2px; }
.review-form-star-btn { background: none; border: none; cursor: pointer; padding: 0; font-size: var(--text-xl); line-height: 1; }
.review-form-star-on { color: var(--accent); }
.review-form-star-off { color: var(--text-faint); }
.review-form-field { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--text-sm); color: var(--text-muted); }
.review-form-input, .review-form-textarea { padding: var(--space-2); border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); font-size: var(--text-sm); color: var(--text); font-family: inherit; }
.review-form-input:focus, .review-form-textarea:focus { outline: none; border-color: var(--accent); }
.review-form-textarea { resize: vertical; min-height: 100px; }
.review-form-actions { display: flex; justify-content: flex-end; }
.review-form-submit { padding: var(--space-2) var(--space-4); border: none; border-radius: var(--radius-md); background: var(--accent); color: var(--surface); cursor: pointer; font-size: var(--text-sm); font-weight: 600; }
.review-form-submit:hover:not(:disabled) { opacity: 0.9; }
.review-form-submit:disabled { opacity: 0.5; cursor: default; }
`;

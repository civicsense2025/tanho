"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/core/Button";
import { Input } from "@/components/forms/Input";
import type { ReviewRow } from "../schema";
import type { ReviewReplyRow } from "../schema";
import {
  approveReview,
  deleteReply,
  hideReview,
  rejectReview,
  replyToReview,
} from "../admin-actions";
import styles from "./reviews.module.css";

/** The reviewer's person row (name/email for display). */
export type ReviewerSummary = {
  id: string;
  name: string;
  email: string;
};

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: ReviewRow["status"] }) {
  const cls =
    status === "pending"
      ? styles.badgePending
      : status === "approved"
        ? styles.badgeApproved
        : styles.badgeRejected;
  const dotColor =
    status === "pending"
      ? "var(--accent)"
      : status === "approved"
        ? "var(--accent-2)"
        : "var(--text-faint)";
  return (
    <span className={`${styles.badge} ${cls}`}>
      <span className={styles.badgeDot} style={{ background: dotColor }} />
      {status}
    </span>
  );
}

function Stars({ rating }: { rating: number }) {
  if (rating === 0) return <span className={styles.starsNone}>No rating (comment only)</span>;
  return (
    <span className={styles.stars}>
      {"★".repeat(rating)}
      <span className={styles.faint}> ({rating}/5)</span>
    </span>
  );
}

function VerifiedBadge({ review }: { review: ReviewRow }) {
  if (!review.verified) {
    return <span className={`${styles.verifiedBadge} ${styles.verifiedBadgeNone}`}>Not verified</span>;
  }
  return (
    <span className={styles.verifiedBadge}>
      ✓ Verified · {review.verifiedMethod}
      {review.verifiedRef ? <span className={styles.mono}> · {review.verifiedRef}</span> : null}
    </span>
  );
}

/** Review detail — full read-out plus Approve / Reject / Hide / Reply actions. */
export function ReviewDetailScreen({
  review,
  reviewer,
  reply,
}: {
  review: ReviewRow;
  reviewer: ReviewerSummary | null;
  reply: Pick<ReviewReplyRow, "body" | "at"> | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [rejectNote, setRejectNote] = useState("");
  const [hideNote, setHideNote] = useState("");
  const [replyBody, setReplyBody] = useState(reply?.body ?? "");

  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, okMsg: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setMsg({ ok: true, text: okMsg });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });

  const onApprove = () => run(() => approveReview(review.id), "Approved");
  const onReject = () => run(() => rejectReview(review.id, { note: rejectNote }), "Rejected");
  const onHide = () => run(() => hideReview(review.id, { note: hideNote }), "Hidden");
  const onReply = () => run(() => replyToReview(review.id, { body: replyBody }), "Reply saved");
  const onDeleteReply = () => run(() => deleteReply(review.id), "Reply deleted");

  return (
    <main className={styles.page}>
      <Link href="/admin/reviews" className={styles.back}>
        ← Back to reviews
      </Link>

      <div className={styles.headerRow}>
        <h1 className={styles.title}>{review.title || "Untitled review"}</h1>
        <span style={{ flex: 1 }} />
        <StatusBadge status={review.status} />
      </div>

      <div className={styles.detailGrid}>
        {/* ---- left: review content ---- */}
        <div className={styles.actionStack}>
          <section className={styles.card}>
            <h2 className={styles.cardHead}>Review</h2>
            <Stars rating={review.rating} />
            <p className={styles.reviewBody}>{review.body || "—"}</p>
            {review.photos.length > 0 ? (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Photos</span>
                <div className={styles.photos}>
                  {review.photos.map((p) => (
                    <span key={p} className={styles.photoChip}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <VerifiedBadge review={review} />
          </section>

          {review.meta && Object.keys(review.meta).length > 0 ? (
            <section className={styles.card}>
              <h2 className={styles.cardHead}>Meta</h2>
              <pre className={`${styles.mono} ${styles.faint}`} style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(review.meta, null, 2)}
              </pre>
            </section>
          ) : null}

          {reply ? (
            <section className={styles.card}>
              <h2 className={styles.cardHead}>Owner reply</h2>
              <p className={styles.reviewBody}>{reply.body}</p>
              <span className={styles.date}>{fmtDate(reply.at)}</span>
              <Button variant="ghost" size="sm" onClick={onDeleteReply} loading={pending}>
                Delete reply
              </Button>
            </section>
          ) : null}
        </div>

        {/* ---- right: reviewer + actions ---- */}
        <div className={styles.actionStack}>
          <section className={styles.card}>
            <h2 className={styles.cardHead}>Reviewer</h2>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Name</span>
              <span className={styles.fieldValue}>{reviewer?.name || "—"}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Email</span>
              <span className={styles.fieldValue}>{reviewer?.email || "—"}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Target</span>
              <span className={`${styles.fieldValue} ${styles.mono}`}>
                {review.targetType}:{review.targetId}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Source</span>
              <span className={styles.fieldValue}>{review.source}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Submitted</span>
              <span className={`${styles.fieldValue} ${styles.mono}`}>{fmtDate(review.at)}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Updated</span>
              <span className={`${styles.fieldValue} ${styles.mono}`}>{fmtDate(review.updatedAt)}</span>
            </div>
            {review.moderationNote ? (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Moderation note</span>
                <span className={styles.fieldValue}>{review.moderationNote}</span>
              </div>
            ) : null}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardHead}>Actions</h2>

            <div className={styles.actionGroup}>
              <div className={styles.actionButtons}>
                <Button variant="accent" size="sm" onClick={onApprove} loading={pending}>
                  Approve
                </Button>
              </div>
            </div>

            <div className={styles.actionGroup}>
              <span className={styles.fieldLabel}>Reject</span>
              <Input
                className={styles.noteField}
                placeholder="Moderation note (optional)"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                disabled={pending}
              />
              <div className={styles.actionButtons}>
                <Button variant="outline" size="sm" onClick={onReject} loading={pending}>
                  Reject
                </Button>
              </div>
            </div>

            <div className={styles.actionGroup}>
              <span className={styles.fieldLabel}>Hide</span>
              <Input
                className={styles.noteField}
                placeholder="Reason (optional)"
                value={hideNote}
                onChange={(e) => setHideNote(e.target.value)}
                disabled={pending}
              />
              <div className={styles.actionButtons}>
                <Button variant="outline" size="sm" onClick={onHide} loading={pending}>
                  Hide
                </Button>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardHead}>Owner reply</h2>
            <textarea
              className={styles.replyTextarea}
              placeholder="Reply as the owner…"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              disabled={pending}
            />
            <div className={styles.actionButtons}>
              <Button variant="accent" size="sm" onClick={onReply} loading={pending}>
                {reply ? "Update reply" : "Post reply"}
              </Button>
            </div>
          </section>

          {msg ? (
            <span className={`${styles.statusMsg} ${msg.ok ? styles.statusOk : styles.error}`}>
              {msg.text}
            </span>
          ) : null}
        </div>
      </div>
    </main>
  );
}

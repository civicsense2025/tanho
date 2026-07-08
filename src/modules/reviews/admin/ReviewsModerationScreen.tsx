"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Seg } from "@/components/admin/Seg";
import { Button } from "@/components/core/Button";
import { Input } from "@/components/forms/Input";
import { approveReview, rejectReview } from "../admin-actions";
import styles from "./reviews.module.css";

/** A review row enriched with the reviewer's display name, for the queue. */
export type ModerationRow = {
  id: string;
  targetType: string;
  targetId: string;
  personId: string;
  rating: number;
  title: string;
  body: string;
  status: "pending" | "approved" | "rejected" | "hidden";
  verified: boolean;
  verifiedMethod: "order" | "enrollment" | "membership" | "none";
  verifiedRef: string | null;
  at: number;
  reviewerName: string;
};

type Tab = "pending" | "all" | "byTarget";

const TAB_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "all", label: "All" },
  { value: "byTarget", label: "By target" },
];

/** "product" → Product; "entry:project" → Project; "custom:courses" → Courses. */
function targetLabel(targetType: string): string {
  if (targetType.startsWith("entry:")) {
    const e = targetType.slice("entry:".length);
    return e.charAt(0).toUpperCase() + e.slice(1);
  }
  if (targetType.startsWith("custom:")) {
    const s = targetType.slice("custom:".length);
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
  }
  return targetType.charAt(0).toUpperCase() + targetType.slice(1);
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: ModerationRow["status"] }) {
  const cls =
    status === "pending"
      ? styles.badgePending
      : status === "approved"
        ? styles.badgeApproved
        : status === "rejected" || status === "hidden"
          ? styles.badgeRejected
          : "";
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
  if (rating === 0) return <span className={`${styles.rating} ${styles.ratingNone}`}>—</span>;
  return <span className={styles.rating}>{"★".repeat(rating)}</span>;
}

/** One queue row — owns its inline reject-note form + action state. */
function QueueRow({ row }: { row: ModerationRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const onApprove = () =>
    startTransition(async () => {
      const res = await approveReview(row.id);
      if (res.ok) {
        setMsg({ ok: true, text: "Approved" });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });

  const onReject = () =>
    startTransition(async () => {
      const res = await rejectReview(row.id, { note });
      if (res.ok) {
        setMsg({ ok: true, text: "Rejected" });
        setRejecting(false);
        setNote("");
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });

  const href = `/admin/reviews/${row.id}`;

  return (
    <div className={styles.row}>
      <div className={styles.cellMain}>
        <Link href={href} className={styles.rowTitle}>
          {row.title || row.body.slice(0, 60) || "Untitled review"}
        </Link>
        <span className={styles.rowBody}>{row.body}</span>
        <span className={styles.date}>{fmtDate(row.at)}</span>
      </div>

      <div className={styles.cellMain}>
        <Link href={href} className={styles.targetLink}>
          {targetLabel(row.targetType)}
        </Link>
        <span className={styles.mono}>{row.targetId}</span>
        <span className={styles.faint}>{row.reviewerName}</span>
      </div>

      <Stars rating={row.rating} />

      <div>
        <StatusBadge status={row.status} />
        {row.verified ? (
          <div className={`${styles.verifiedBadge}`}>
            ✓ {row.verifiedMethod}
          </div>
        ) : null}
      </div>

      <div className={styles.rowActions}>
        {rejecting ? (
          <div className={styles.noteInline}>
            <Input
              className={styles.noteInlineInput}
              placeholder="Moderation note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={pending}
            />
            <Button variant="outline" size="sm" onClick={onReject} loading={pending}>
              Confirm
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRejecting(false);
                setNote("");
              }}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className={styles.rowActionRow}>
            {row.status !== "approved" ? (
              <Button variant="accent" size="sm" onClick={onApprove} loading={pending}>
                Approve
              </Button>
            ) : null}
            {row.status !== "rejected" ? (
              <Button variant="ghost" size="sm" onClick={() => setRejecting(true)} disabled={pending}>
                Reject
              </Button>
            ) : null}
            <Link href={href} className={styles.back}>
              Open
            </Link>
          </div>
        )}
        {msg ? (
          <span className={`${styles.statusMsg} ${msg.ok ? styles.statusOk : styles.error}`}>
            {msg.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** A flat table of rows, shared by the Pending and All tabs. */
function RowTable({ rows }: { rows: ModerationRow[] }) {
  if (rows.length === 0) {
    return <div className={styles.faint}>No reviews in this view.</div>;
  }
  return (
    <div className={styles.table}>
      <div className={styles.tableHead}>
        <span>Review</span>
        <span>Target / reviewer</span>
        <span>Rating</span>
        <span>Status</span>
        <span>Actions</span>
      </div>
      {rows.map((row) => (
        <QueueRow key={row.id} row={row} />
      ))}
    </div>
  );
}

/** The "By target" tab — rows grouped by targetType with a count per group. */
function GroupedByTarget({ rows }: { rows: ModerationRow[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, ModerationRow[]>();
    for (const r of rows) {
      const list = map.get(r.targetType) ?? [];
      list.push(r);
      map.set(r.targetType, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  if (groups.length === 0) {
    return <div className={styles.faint}>No reviews yet.</div>;
  }
  return (
    <div className={styles.group}>
      {groups.map(([targetType, list]) => (
        <div key={targetType} className={styles.group}>
          <div className={styles.groupHead}>
            <span className={styles.groupLabel}>{targetLabel(targetType)}</span>
            <span className={styles.mono}>{targetType}</span>
            <span className={styles.groupCount}>
              {list.length} {list.length === 1 ? "review" : "reviews"}
            </span>
          </div>
          <RowTable rows={list} />
        </div>
      ))}
    </div>
  );
}

/** Reviews moderation queue — Pending / All / By target tabs. */
export function ReviewsModerationScreen({
  pending,
  all,
}: {
  pending: ModerationRow[];
  all: ModerationRow[];
}) {
  const [tab, setTab] = useState<Tab>("pending");

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Reviews</h1>
        <span style={{ flex: 1 }} />
        <Link href="/admin/reviews/settings" className={styles.back}>
          Settings
        </Link>
      </div>

      <Seg value={tab} onChange={(v) => setTab(v as Tab)} options={TAB_OPTIONS} />

      {tab === "pending" ? <RowTable rows={pending} /> : null}
      {tab === "all" ? <RowTable rows={all} /> : null}
      {tab === "byTarget" ? <GroupedByTarget rows={all} /> : null}
    </main>
  );
}

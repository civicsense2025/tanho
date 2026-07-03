"use client";

import type { Segment } from "../queries";
import styles from "./people.module.css";

const LABELS: Array<{ id: Segment; label: string }> = [
  { id: "all-active", label: "Active" },
  { id: "members", label: "Members" },
  { id: "subscribers", label: "Subscribers" },
  { id: "unsubscribed", label: "Unsubscribed" },
  { id: "leads", label: "Leads" },
  { id: "staff", label: "Staff" },
  { id: "invited", label: "Invited" },
];

/** Segment filter pills with counts, driving the people list. */
export function SegmentPills({
  active,
  counts,
  onSelect,
}: {
  active: Segment;
  counts: Record<Segment, number>;
  onSelect: (segment: Segment) => void;
}) {
  return (
    <div className={styles.pills} role="tablist">
      {LABELS.map((s) => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={active === s.id}
          className={`${styles.pill} ${active === s.id ? styles.pillActive : ""}`}
          onClick={() => onSelect(s.id)}
        >
          {s.label}
          <span className={styles.pillCount}>{counts[s.id]}</span>
        </button>
      ))}
    </div>
  );
}

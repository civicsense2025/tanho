"use client";

import { useRouter } from "next/navigation";
import { EntityList, type EntityListColumn } from "@/components/admin/EntityList";
import type { QuietReaderRow } from "../digest";
import styles from "./people.module.css";

const pct = (ratio: number) => (Number.isFinite(ratio) ? `${Math.round(ratio * 100)}%` : "0%");
const day = (ms: number | null) => (ms ? new Date(ms).toISOString().slice(0, 10) : "—");

const columns: EntityListColumn<QuietReaderRow>[] = [
  {
    key: "tier",
    header: "Tier",
    render: (r) => <span>{r.tier || "—"}</span>,
  },
  {
    key: "views",
    header: "Views (recent / prior)",
    render: (r) => (
      <span className={styles.mono}>
        {r.recentViews} / {r.priorViews}
      </span>
    ),
  },
  {
    key: "drop",
    header: "Drop",
    align: "end",
    render: (r) => <span className={styles.mono}>{pct(r.dropRatio)}</span>,
  },
  {
    key: "lastSeen",
    header: "Last seen",
    align: "end",
    render: (r) => <span className={styles.mono}>{day(r.lastSeenAt)}</span>,
  },
];

/**
 * Read-only ranked list of paying members whose reading dropped sharply vs.
 * their own baseline — an on-demand admin screen (no scheduled delivery yet;
 * this codebase has no job-scheduler infrastructure to hang that on).
 */
export function QuietReaderDigest({ rows }: { rows: QuietReaderRow[] }) {
  const router = useRouter();

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Reader digest</h1>
      </div>
      <p className={styles.faint}>
        Active members whose reading dropped sharply vs. their own baseline over the last 30 days.
      </p>
      <EntityList
        items={rows}
        getId={(r) => r.personId}
        columns={columns}
        getTitle={(r) => r.name || r.email}
        getSubtitle={(r) => r.email}
        searchValues={(r) => [r.name, r.email, r.tier]}
        editHref={(r) => `/admin/people/${r.personId}`}
        onRowClick={(r) => router.push(`/admin/people/${r.personId}`)}
        emptyLabel="No members are showing a reading drop right now."
        noun="Member"
      />
    </main>
  );
}

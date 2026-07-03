import type { ReactNode } from "react";
import styles from "./profile.module.css";

type Activity = {
  id: string;
  type: string;
  label: string;
  at: number;
};

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/** A real glyph per activity type (not a text symbol). */
const GLYPH: Record<string, ReactNode> = {
  view: <><circle cx="8" cy="8" r="2.5" {...S} /><path d="M1.5 8s2.4-4 6.5-4 6.5 4 6.5 4-2.4 4-6.5 4-6.5-4-6.5-4Z" {...S} /></>,
  form: <><rect x="3" y="2.5" width="10" height="11" rx="1.5" {...S} /><path d="M5.5 6h5M5.5 8.5h5M5.5 11h3" {...S} /></>,
  order: <><path d="M2.5 3H4l1.2 7.3h6l1-5H5" {...S} /><circle cx="6.5" cy="13" r="0.9" {...S} /><circle cx="10.8" cy="13" r="0.9" {...S} /></>,
  subscribe: <><rect x="2" y="3.5" width="12" height="9" rx="1.5" {...S} /><path d="m2.5 4.5 5.5 4 5.5-4" {...S} /></>,
  login: <><path d="M6.5 2.5H12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6.5M3 8h6.5M7 5.5 9.5 8 7 10.5" {...S} /></>,
  note: <><path d="M3 2.5h7l3 3v8H3zM10 2.5v3h3" {...S} /></>,
};

const stamp = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace("T", " ");

/** Vertical activity timeline: icon per type, label, mono timestamp. */
export function ActivityTimeline({ activity }: { activity: Activity[] }) {
  if (activity.length === 0) {
    return <p className={styles.faint}>No activity yet.</p>;
  }
  return (
    <ul className={styles.timeline}>
      {activity.map((a) => (
        <li key={a.id} className={styles.event}>
          <span className={styles.icon} aria-hidden>
            <svg width="14" height="14" viewBox="0 0 16 16">
              {GLYPH[a.type] ?? <circle cx="8" cy="8" r="2" fill="currentColor" />}
            </svg>
          </span>
          <span className={styles.eventLabel}>{a.label}</span>
          <span className={styles.eventTime}>{stamp(a.at)}</span>
        </li>
      ))}
    </ul>
  );
}

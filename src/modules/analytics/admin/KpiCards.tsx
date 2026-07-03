import type { AnalyticsOverview } from "../queries";
import styles from "./analytics.module.css";

/** Period-over-period delta as a percent, rounded; null when the prior
 *  window had no data (a delta would be meaningless/infinite). */
function deltaPct(current: number, prior: number): number | null {
  if (prior === 0) return current === 0 ? 0 : null;
  return Math.round(((current - prior) / prior) * 100);
}

function Trend({ current, prior }: { current: number; prior: number }) {
  const pct = deltaPct(current, prior);
  if (pct === null) return null;
  const up = pct > 0;
  const down = pct < 0;
  return (
    <span className={`${styles.kpiTrend} ${up ? styles.kpiTrendUp : ""} ${down ? styles.kpiTrendDown : ""}`}>
      {up ? "↑" : down ? "↓" : "→"} {Math.abs(pct)}%
    </span>
  );
}

/** The four top-line KPI cards for the Overview screen, each with a real
 *  period-over-period trend (current window vs. the equal-length window
 *  immediately before it). */
export function KpiCards({ data }: { data: AnalyticsOverview }) {
  const cards: Array<{ label: string; value: number; prior: number; hint: string }> = [
    { label: "Visitors", value: data.visitors, prior: data.prior.visitors, hint: "distinct sessions" },
    { label: "Page views", value: data.pageviews, prior: data.prior.pageviews, hint: "pageview events" },
    { label: "Events", value: data.events, prior: data.prior.events, hint: "all tracked events" },
    { label: "Pages seen", value: data.pages, prior: data.prior.pages, hint: "distinct paths" },
  ];
  return (
    <div className={styles.kpiGrid}>
      {cards.map((c) => (
        <div key={c.label} className={styles.kpiCard}>
          <span className={styles.kpiLabel}>{c.label}</span>
          <span className={styles.kpiValue}>{c.value.toLocaleString()}</span>
          <div className={styles.kpiFooter}>
            <span className={styles.kpiHint}>{c.hint}</span>
            <Trend current={c.value} prior={c.prior} />
          </div>
        </div>
      ))}
    </div>
  );
}

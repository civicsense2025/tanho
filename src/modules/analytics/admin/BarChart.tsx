import type { DayBucket } from "../queries";
import styles from "./analytics.module.css";

/**
 * A tiny, dependency-free SVG bar chart of pageviews over time. Pure and
 * server-rendered: it takes pre-bucketed data and draws bars scaled to the
 * max. Uses CSS custom properties for colour so it themes with the site.
 */
export function BarChart({ data }: { data: DayBucket[] }) {
  const W = 640;
  const H = 160;
  const pad = { top: 8, right: 8, bottom: 20, left: 8 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const max = Math.max(1, ...data.map((d) => d.count));
  const slot = data.length > 0 ? innerW / data.length : innerW;
  const barW = Math.max(2, slot * 0.6);

  return (
    <div className={styles.chart}>
      <svg
        className={styles.chartSvg}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Pageviews over time"
        preserveAspectRatio="none"
      >
        {data.map((d, i) => {
          const h = (d.count / max) * innerH;
          const x = pad.left + i * slot + (slot - barW) / 2;
          const y = pad.top + (innerH - h);
          const isFirstOfMonth = d.day.endsWith("-01");
          return (
            <g key={d.day}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={1}
                fill="var(--accent)"
                opacity={d.count === 0 ? 0.15 : 0.85}
              >
                <title>{`${d.day}: ${d.count}`}</title>
              </rect>
              {isFirstOfMonth || i === 0 || i === data.length - 1 ? (
                <text
                  x={x + barW / 2}
                  y={H - 6}
                  textAnchor="middle"
                  fontSize="9"
                  fill="var(--text-faint)"
                >
                  {d.day.slice(5)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

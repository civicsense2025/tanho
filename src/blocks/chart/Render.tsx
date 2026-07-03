import type { CSSProperties } from "react";
import type { RenderCtx } from "../types";
import type { ChartContent, ChartSeriesItem } from "./fields";

/** Section-head style for the optional title. */
const HEAD: CSSProperties = {
  margin: "0 0 var(--space-4)",
  fontFamily: "var(--font-label)",
  fontSize: "var(--text-xs)",
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-widest)",
  color: "var(--text-muted)",
};

/** Mono 9px micro-label — SVG (fill) and HTML (color) flavors. */
const MONO9: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "9px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  fill: "var(--text-faint)",
};
const MONO9_HTML: CSSProperties = { ...MONO9, fill: undefined, color: "var(--text-faint)" };

const DONUT_COLORS = ["var(--accent)", "var(--accent-2)", "var(--border-strong)"];

function BarChart({ series }: { series: ChartSeriesItem[] }) {
  const max = Math.max(1, ...series.map((s) => s.value));
  const W = 460;
  const H = 200;
  const BASE = 182;
  const slot = W / Math.max(1, series.length);
  const barW = Math.min(44, slot * 0.6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" style={{ width: "100%", height: "auto", display: "block" }}>
      {series.map((s, i) => {
        const barH = Math.max(4, (s.value / max) * (BASE - 26));
        const cx = slot * i + slot / 2;
        return (
          <g key={i}>
            <text x={cx} y={BASE - barH - 6} textAnchor="middle" style={MONO9}>
              {s.value}
            </text>
            <rect
              x={slot * i + (slot - barW) / 2}
              y={BASE - barH}
              width={barW}
              height={barH}
              style={{ fill: "var(--accent)", fillOpacity: 0.55 + 0.45 * (s.value / max) }}
            />
            <text x={cx} y={H - 4} textAnchor="middle" style={MONO9}>
              {s.label}
            </text>
          </g>
        );
      })}
      <line x1={0} y1={BASE} x2={W} y2={BASE} style={{ stroke: "var(--border)" }} />
    </svg>
  );
}

function LineChart({ series }: { series: ChartSeriesItem[] }) {
  const max = Math.max(1, ...series.map((s) => s.value));
  const W = 460;
  const H = 170;
  const PAD = 12;
  const points = series
    .map((s, i) => {
      const x = PAD + (i * (W - PAD * 2)) / Math.max(1, series.length - 1);
      const y = H - PAD - (s.value / max) * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" style={{ width: "100%", height: "auto", display: "block" }}>
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} style={{ stroke: "var(--border)" }} />
        <polyline
          points={points}
          style={{
            fill: "none",
            stroke: "var(--accent)",
            strokeWidth: 1.5,
            strokeLinecap: "round",
            strokeLinejoin: "round",
          }}
        />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
        {series.map((s, i) => (
          <span key={i} style={MONO9_HTML}>
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Cumulative start fraction for each donut segment (pure, no mutation in render). */
function donutSegments(series: ChartSeriesItem[], total: number) {
  const segments: Array<{ frac: number; start: number }> = [];
  let acc = 0;
  for (const s of series) {
    segments.push({ frac: s.value / total, start: acc });
    acc += s.value / total;
  }
  return segments;
}

function DonutChart({ series }: { series: ChartSeriesItem[] }) {
  const total = series.reduce((sum, s) => sum + s.value, 0) || 1;
  const R = 60;
  const C = 2 * Math.PI * R;
  const segments = donutSegments(series, total);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" }}>
      <svg viewBox="0 0 160 160" role="img" style={{ width: "160px", height: "160px" }}>
        <g transform="rotate(-90 80 80)">
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx="80"
              cy="80"
              r={R}
              strokeWidth="22"
              strokeDasharray={`${seg.frac * C} ${C - seg.frac * C}`}
              strokeDashoffset={-seg.start * C}
              style={{ fill: "none", stroke: DONUT_COLORS[i % DONUT_COLORS.length] }}
            />
          ))}
        </g>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {series.map((s, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
            }}
          >
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "2px",
                background: DONUT_COLORS[i % DONUT_COLORS.length],
              }}
            />
            {s.label}
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", color: "var(--text-faint)" }}>
              {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Server-rendered SVG chart — bar, line or donut. No client JS. */
export function RenderChart({ content }: { content: ChartContent; ctx: RenderCtx }) {
  return (
    <div>
      {content.title && <div style={HEAD}>{content.title}</div>}
      {content.kind === "bar" && <BarChart series={content.series} />}
      {content.kind === "line" && <LineChart series={content.series} />}
      {content.kind === "donut" && <DonutChart series={content.series} />}
    </div>
  );
}

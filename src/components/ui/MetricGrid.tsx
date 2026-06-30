import type { CSSProperties } from "react";

export interface Metric {
  value: string;
  label: string;
}

/** MetricGrid — the case-study metric block. Values in medium ink, mono
 *  uppercase labels beneath, hairline gutters. */
export function MetricGrid({ metrics = [], columns = 3, style }: { metrics?: Metric[]; columns?: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: "1px",
        background: "var(--border)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
        ...style,
      }}
    >
      {metrics.map((m, i) => (
        <div key={i} style={{ background: "var(--bg)", padding: "var(--space-5)" }}>
          <div
            style={{
              fontSize: "var(--text-h2)",
              fontWeight: 500,
              color: "var(--text)",
              marginBottom: "4px",
              letterSpacing: "var(--tracking-tight)",
            }}
          >
            {m.value}
          </div>
          <div
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "var(--text-2xs)",
              textTransform: "uppercase",
              letterSpacing: "var(--tracking-wide)",
              color: "var(--text-muted)",
            }}
          >
            {m.label}
          </div>
        </div>
      ))}
    </div>
  );
}

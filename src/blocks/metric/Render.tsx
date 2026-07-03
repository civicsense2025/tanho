import type { RenderCtx } from "../types";
import type { MetricContent } from "./fields";

/** Big-number stat grid with hairline gutters between cells. */
export function RenderMetric({ content, ctx }: { content: MetricContent; ctx: RenderCtx }) {
  const cols = ctx.device === "desktop" ? content.cols : Math.min(content.cols, 2);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {content.items.map((item, i) => {
        const firstInRow = i % cols === 0;
        const firstRow = i < cols;
        return (
          <div
            key={i}
            style={{
              padding: "var(--space-4) var(--space-5)",
              paddingLeft: firstInRow ? 0 : "var(--space-5)",
              paddingTop: firstRow ? 0 : "var(--space-4)",
              borderLeft: firstInRow ? "none" : "1px solid var(--border)",
              borderTop: firstRow ? "none" : "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontSize: "var(--text-h1)",
                fontWeight: 500,
                letterSpacing: "var(--tracking-tight)",
                lineHeight: 1,
                color: "var(--text)",
              }}
            >
              {item.value}
            </div>
            <div
              style={{
                marginTop: "var(--space-2)",
                fontFamily: "var(--font-label)",
                fontSize: "var(--text-2xs)",
                textTransform: "uppercase",
                letterSpacing: "var(--tracking-wide)",
                color: "var(--text-muted)",
              }}
            >
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

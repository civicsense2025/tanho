import type { RenderCtx } from "../types";
import type { ProgressContent } from "./fields";

/** Labelled progress bars — 6px pill track with accent fill. */
export function RenderProgress({ content }: { content: ProgressContent; ctx: RenderCtx }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {content.items.map((item, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>{item.label}</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-2xs)",
                color: "var(--text-faint)",
              }}
            >
              {item.pct}%
            </span>
          </div>
          <div
            style={{
              height: "6px",
              borderRadius: "var(--radius-pill)",
              background: "var(--surface)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${item.pct}%`,
                height: "100%",
                background: "var(--accent)",
                borderRadius: "var(--radius-pill)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

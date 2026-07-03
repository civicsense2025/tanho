import type { RenderCtx } from "../types";
import type { TimelineContent } from "./fields";

/** Vertical rail with accent dot markers — mono date, title, muted note. */
export function RenderTimeline({ content }: { content: TimelineContent; ctx: RenderCtx }) {
  return (
    <div style={{ position: "relative", paddingLeft: "var(--space-5)" }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "4px",
          top: "6px",
          bottom: "6px",
          width: "1px",
          background: "var(--border)",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        {content.items.map((item, i) => (
          <div key={i} style={{ position: "relative" }}>
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: "-19px",
                top: "5px",
                width: "9px",
                height: "9px",
                borderRadius: "50%",
                background: "var(--bg)",
                border: "2px solid var(--accent)",
              }}
            />
            <div
              style={{
                fontFamily: "var(--font-label)",
                fontSize: "var(--text-2xs)",
                textTransform: "uppercase",
                letterSpacing: "var(--tracking-wide)",
                color: "var(--text-faint)",
              }}
            >
              {item.date}
            </div>
            <div style={{ fontSize: "var(--text-body)", fontWeight: 500, color: "var(--text)", marginTop: "2px" }}>
              {item.title}
            </div>
            {item.note && (
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: "2px" }}>
                {item.note}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import type { RenderCtx } from "../types";
import type { ToggleContent } from "./fields";

/**
 * A labelled two-option segmented control shown as a static pill — the active
 * side is filled with the accent. Purely presentational (real toggling needs JS,
 * which is out of scope): a visual element, so no button/input semantics.
 */
export function RenderToggle({ content }: { content: ToggleContent; ctx: RenderCtx }) {
  const { leftLabel, rightLabel, active, note } = content;

  const seg = (label: string, on: boolean) => (
    <span
      style={{
        padding: "var(--space-2) var(--space-4)",
        borderRadius: "var(--radius-pill)",
        fontSize: "var(--text-sm)",
        fontWeight: 500,
        whiteSpace: "nowrap",
        color: on ? "var(--text-on-accent)" : "var(--text-muted)",
        background: on ? "var(--accent)" : "transparent",
      }}
    >
      {label}
    </span>
  );

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-3)" }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-0-5)",
          padding: "3px",
          borderRadius: "var(--radius-pill)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        {seg(leftLabel, active === "left")}
        {seg(rightLabel, active === "right")}
      </span>
      {note ? (
        <span style={{ fontSize: "var(--text-sm)", color: "var(--accent)", fontWeight: 500 }}>
          {note}
        </span>
      ) : null}
    </div>
  );
}

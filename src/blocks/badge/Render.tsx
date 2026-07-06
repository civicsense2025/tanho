import type { RenderCtx } from "../types";
import type { BadgeContent } from "./fields";

/**
 * Tone → the pill's fill/ink. accent rides the theme accent; neutral is a bordered
 * surface chip; success/warning use the same fixed semantic status colours as the
 * alert block (status meaning shouldn't shift with a brand swap).
 */
const TONES: Record<string, { bg: string; color: string; border: string }> = {
  neutral: { bg: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" },
  accent: { bg: "var(--accent)", color: "var(--text-on-accent)", border: "none" },
  success: { bg: "color-mix(in srgb, #157f52 14%, transparent)", color: "#157f52", border: "none" },
  warning: { bg: "color-mix(in srgb, #b45309 14%, transparent)", color: "#b45309", border: "none" },
};

/** A small inline label/tag pill. */
export function RenderBadge({ content }: { content: BadgeContent; ctx: RenderCtx }) {
  const { text, tone, icon } = content;
  const t = TONES[tone] ?? TONES.accent;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px var(--space-2)",
        borderRadius: "var(--radius-pill)",
        background: t.bg,
        color: t.color,
        border: t.border,
        fontSize: "var(--text-2xs)",
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: "var(--tracking-wide)",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {text}
    </span>
  );
}

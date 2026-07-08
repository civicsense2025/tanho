import type { RenderCtx } from "../types";
import type { AlertContent } from "./fields";

/**
 * Tone → the accent colour driving the banner. `info` rides the theme accent
 * tokens (so it re-skins with the site); success/warning/error use fixed semantic
 * status colours — the theme only guarantees accent tokens, and status meaning
 * shouldn't shift with a brand swap (the codebase uses fixed status hues elsewhere).
 * The background is a low-alpha wash of the same colour via color-mix.
 */
const TONES: Record<string, { color: string; bg: string; glyph: string }> = {
  info: { color: "var(--accent)", bg: "var(--accent-tint)", glyph: "ℹ" },
  success: { color: "#157f52", bg: "color-mix(in srgb, #157f52 12%, transparent)", glyph: "✓" },
  warning: { color: "#b45309", bg: "color-mix(in srgb, #b45309 12%, transparent)", glyph: "⚠" },
  error: { color: "#b0342f", bg: "color-mix(in srgb, #b0342f 12%, transparent)", glyph: "✕" },
};

/** Bordered, tinted notice with a left accent stripe. */
export function RenderAlert({ content }: { content: AlertContent; ctx: RenderCtx }) {
  const { tone, title, body, icon } = content;
  const t = TONES[tone] ?? TONES.info;

  return (
    <div
      role="note"
      style={{
        display: "flex",
        gap: "var(--space-3)",
        padding: "var(--space-4)",
        background: t.bg,
        border: `1px solid color-mix(in srgb, ${t.color} 30%, transparent)`,
        borderInlineStart: `3px solid ${t.color}`,
        borderRadius: "var(--radius-sm)",
      }}
    >
      {icon ? (
        <span
          aria-hidden="true"
          style={{ flex: "0 0 auto", color: t.color, fontSize: "var(--text-body)", lineHeight: "var(--leading-normal)" }}
        >
          {t.glyph}
        </span>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-0-5)", minWidth: 0 }}>
        {title ? (
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text)" }}>{title}</div>
        ) : null}
        {body ? (
          <div
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
              lineHeight: "var(--leading-normal)",
            }}
          >
            {body}
          </div>
        ) : null}
      </div>
    </div>
  );
}

import type { RenderCtx } from "../types";
import type { CalloutContent } from "./fields";

/** Tone → tint background + ink used for the hairline border. */
const TONES: Record<string, { bg: string; ink: string }> = {
  info: { bg: "var(--accent-2-tint)", ink: "var(--accent-2)" },
  tip: { bg: "var(--accent-2-tint)", ink: "var(--accent-2)" },
  warning: { bg: "var(--accent-tint)", ink: "var(--accent)" },
  danger: { bg: "var(--accent-tint)", ink: "var(--accent)" },
};

/** Tinted note card — info/tip wash green, warning/danger wash red. */
export function RenderCallout({ content }: { content: CalloutContent; ctx: RenderCtx }) {
  const tone = TONES[content.tone] ?? TONES.info;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "3px",
        padding: "var(--space-4)",
        background: tone.bg,
        border: `1px solid color-mix(in srgb, ${tone.ink} 22%, transparent)`,
        borderRadius: "var(--radius-sm)",
      }}
    >
      {content.title && (
        <div style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text)" }}>
          {content.title}
        </div>
      )}
      {content.body && (
        <div
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
            lineHeight: "var(--leading-normal)",
          }}
        >
          {content.body}
        </div>
      )}
    </div>
  );
}

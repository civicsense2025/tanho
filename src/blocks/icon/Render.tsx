import type { RenderCtx } from "../types";
import type { IconContent } from "./fields";

const SIZE_VAR: Record<IconContent["size"], string> = {
  sm: "var(--text-lg)",
  md: "var(--text-h2)",
  lg: "var(--text-h1)",
  xl: "var(--text-display)",
};

const COLOR_VAR: Record<IconContent["color"], string> = {
  default: "var(--text)",
  muted: "var(--text-muted)",
  accent: "var(--accent)",
  "accent-2": "var(--accent-2)",
};

/** A standalone icon/glyph. Decorative unless a `label` gives it an accessible name. */
export function RenderIcon({ content }: { content: IconContent; ctx: RenderCtx }) {
  const { glyph, size, color, label } = content;
  return (
    <span
      role="img"
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: SIZE_VAR[size] ?? SIZE_VAR.md,
        lineHeight: 1,
        color: COLOR_VAR[color] ?? COLOR_VAR.default,
      }}
    >
      {glyph}
    </span>
  );
}

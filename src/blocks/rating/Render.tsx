import type { RenderCtx } from "../types";
import type { RatingContent } from "./fields";

/**
 * A static star-rating display. Each of `max` stars is a positioned empty glyph
 * (☆) with a filled glyph (★) clipped over it to a width proportional to how much
 * of that star the value covers — so halves render as a true 50%-wide fill, no JS.
 */
export function RenderRating({ content }: { content: RatingContent; ctx: RenderCtx }) {
  const { value, max, showValue, label } = content;
  const clamped = Math.max(0, Math.min(max, value));

  const star = (i: number) => {
    // Fraction of THIS star (0, .5, 1 typically) that should be filled.
    const fill = Math.max(0, Math.min(1, clamped - i));
    return (
      <span
        key={i}
        aria-hidden="true"
        style={{ position: "relative", display: "inline-block", color: "var(--text-faint)" }}
      >
        ☆
        <span
          style={{
            position: "absolute",
            insetBlock: 0,
            insetInlineStart: 0,
            width: `${fill * 100}%`,
            overflow: "hidden",
            color: "var(--accent)",
          }}
        >
          ★
        </span>
      </span>
    );
  };

  return (
    <div
      role="img"
      aria-label={label || `Rated ${clamped} out of ${max}`}
      style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
    >
      <span style={{ display: "inline-flex", fontSize: "var(--text-lg)", lineHeight: 1, letterSpacing: "1px" }}>
        {Array.from({ length: max }, (_, i) => star(i))}
      </span>
      {showValue ? (
        <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-muted)" }}>
          {clamped}
        </span>
      ) : null}
      {label ? (
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-faint)" }}>{label}</span>
      ) : null}
    </div>
  );
}

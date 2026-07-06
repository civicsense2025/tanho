import type { RenderCtx } from "../types";
import type { CounterContent } from "./fields";

/** Format a number with grouped thousands + fixed decimals (locale-independent so
 *  SSR and client agree). */
function format(n: number, decimals: number): string {
  const fixed = n.toFixed(decimals);
  const [int, frac] = fixed.split(".");
  const grouped = int!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${grouped}.${frac}` : grouped;
}

/**
 * A stat that counts up to its value when it scrolls into view. The server renders
 * the FINAL number (no-JS fallback = the real value, never 0), and stamps
 * `data-counter-*`; the client island (blocks/client/enhancements) animates it from 0.
 * Under reduced-motion the island leaves the final number in place.
 */
export function RenderCounter({ content }: { content: CounterContent; ctx: RenderCtx }) {
  const { value, prefix, suffix, decimals, duration, label } = content;
  const shown = format(value, decimals);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "2px", fontFamily: "var(--font-display)" }}>
        {prefix ? <span style={{ fontSize: "var(--text-h2)", color: "var(--text)" }}>{prefix}</span> : null}
        <span
          data-counter=""
          data-counter-to={String(value)}
          data-counter-decimals={String(decimals)}
          data-counter-duration={String(duration)}
          style={{ fontSize: "var(--text-display)", fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}
        >
          {shown}
        </span>
        {suffix ? <span style={{ fontSize: "var(--text-h2)", color: "var(--text)" }}>{suffix}</span> : null}
      </div>
      {label ? <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{label}</div> : null}
    </div>
  );
}

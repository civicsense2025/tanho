import type { RenderCtx } from "../types";
import type { CountdownContent } from "./fields";

const UNIT_LABEL: Record<string, string> = {
  days: "Days",
  hours: "Hours",
  minutes: "Min",
  seconds: "Sec",
};

/**
 * A live countdown to a target instant. The island (blocks/client/enhancements) ticks
 * each second and fills the unit slots; it also reveals the "expired" message once the
 * target passes. Server render is the no-JS state: unit boxes showing "--" (the target
 * time can only be evaluated live, so a static value would be wrong the moment it ships).
 */
export function RenderCountdown({ content }: { content: CountdownContent; ctx: RenderCtx }) {
  const { target, units, expiredText, label } = content;
  if (!target) return null;

  return (
    <div
      data-countdown=""
      data-countdown-target={target}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", alignItems: "center" }}
    >
      {label ? <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{label}</div> : null}
      <div data-countdown-timer="" style={{ display: "flex", gap: "var(--space-3)" }}>
        {units.map((u) => (
          <div
            key={u}
            style={{
              minWidth: "64px",
              padding: "var(--space-3) var(--space-2)",
              borderRadius: "var(--radius-md)",
              background: "var(--surface-card)",
              border: "1px solid var(--border)",
              textAlign: "center",
            }}
          >
            <div
              data-countdown-unit={u}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-h1)",
                fontWeight: 700,
                color: "var(--text)",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
              }}
            >
              --
            </div>
            <div
              style={{
                marginTop: "var(--space-1)",
                fontFamily: "var(--font-label)",
                fontSize: "var(--text-2xs)",
                textTransform: "uppercase",
                letterSpacing: "var(--tracking-wide)",
                color: "var(--text-faint)",
              }}
            >
              {UNIT_LABEL[u]}
            </div>
          </div>
        ))}
      </div>
      <div data-countdown-expired="" hidden style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        {expiredText}
      </div>
    </div>
  );
}

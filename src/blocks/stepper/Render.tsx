import type { RenderCtx } from "../types";
import type { StepperContent } from "./fields";

/**
 * A multi-step / progress indicator (Elementor calls it a "Progress Tracker").
 * Pure CSS, no JS — a numbered/dotted marker per step with a connector line, laid
 * out horizontally or vertically. Steps before `current` read as done (accent),
 * `current` is emphasised, later steps are muted. `current` of 0 = none active.
 */
export function RenderStepper({ content }: { content: StepperContent; ctx: RenderCtx }) {
  const { orientation, marker, current, items } = content;
  const horizontal = orientation === "horizontal";

  return (
    <ol
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: horizontal ? "row" : "column",
        gap: 0,
      }}
    >
      {items.map((item, i) => {
        const n = i + 1;
        const done = current > 0 && n < current;
        const active = current > 0 && n === current;
        const reached = done || active;
        const isLast = i === items.length - 1;

        const dot = marker === "dot";
        const markerColor = reached ? "var(--text-on-accent)" : "var(--text-faint)";
        const markerBg = reached ? "var(--accent)" : "var(--surface)";
        const markerBorder = active ? "var(--accent)" : reached ? "var(--accent)" : "var(--border)";
        const size = dot ? 14 : 30;

        return (
          <li
            key={i}
            style={{
              display: "flex",
              flexDirection: horizontal ? "column" : "row",
              alignItems: horizontal ? "center" : "flex-start",
              gap: horizontal ? "var(--space-2)" : "var(--space-3)",
              flex: horizontal ? "1 1 0" : undefined,
              textAlign: horizontal ? "center" : "left",
              position: "relative",
            }}
          >
            {/* marker + connector */}
            <div
              style={{
                display: "flex",
                flexDirection: horizontal ? "row" : "column",
                alignItems: "center",
                alignSelf: horizontal ? "stretch" : undefined,
                width: horizontal ? "100%" : size,
              }}
            >
              <span
                aria-hidden={dot || undefined}
                style={{
                  flex: "0 0 auto",
                  width: size,
                  height: size,
                  borderRadius: "var(--radius-pill)",
                  background: markerBg,
                  border: `1px solid ${markerBorder}`,
                  color: markerColor,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-label)",
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                }}
              >
                {marker === "number" ? n : ""}
              </span>
              {!isLast ? (
                <span
                  style={
                    horizontal
                      ? { flex: 1, height: "1px", background: done ? "var(--accent)" : "var(--border)", marginInline: "var(--space-2)" }
                      : { width: "1px", flex: 1, minHeight: "var(--space-6)", background: done ? "var(--accent)" : "var(--border)", marginBlock: "var(--space-1)" }
                  }
                />
              ) : null}
            </div>

            {/* label + description */}
            <div style={{ paddingBottom: horizontal ? 0 : "var(--space-4)" }}>
              <div
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: active ? 600 : 500,
                  color: reached ? "var(--text)" : "var(--text-muted)",
                }}
              >
                {item.label}
              </div>
              {item.description ? (
                <div style={{ marginTop: "2px", fontSize: "var(--text-xs)", color: "var(--text-faint)", maxWidth: "28ch" }}>
                  {item.description}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

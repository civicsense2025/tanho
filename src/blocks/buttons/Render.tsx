import type { CSSProperties } from "react";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { RADIUS_VAR } from "../common";
import type { RenderCtx } from "../types";
import type { ButtonsContent } from "./fields";

const JUSTIFY: Record<string, string> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

/** Visual values copied from src/components/core/Button.module.css (md size). */
const BASE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5em",
  padding: "9px 18px",
  borderRadius: "var(--radius-sm)",
  fontSize: "var(--text-xs)",
  lineHeight: 1,
  textDecoration: "none",
  whiteSpace: "nowrap",
  border: "1px solid transparent",
  transition: "var(--transition)",
};

const VARIANTS: Record<string, CSSProperties> = {
  solid: {
    ...BASE,
    fontWeight: 500,
    background: "var(--solid)",
    color: "var(--text-on-accent)",
    borderColor: "var(--solid)",
  },
  outline: {
    ...BASE,
    fontFamily: "var(--font-label)",
    fontWeight: 400,
    textTransform: "uppercase",
    letterSpacing: "var(--tracking-wide)",
    background: "transparent",
    color: "var(--text)",
    borderColor: "var(--border)",
  },
};

/** CTA row — anchors styled like the core Button component. */
export function RenderButtons({ content, ctx }: { content: ButtonsContent; ctx: RenderCtx }) {
  // Per-block radius drives the actual button corners; falls back to the theme
  // token so buttons round with the site's corner-radius preset unless overridden.
  const radius = content.radius ? RADIUS_VAR[content.radius] : "var(--radius-sm)";
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--space-3)",
        justifyContent: JUSTIFY[content.align] ?? "flex-start",
      }}
    >
      {content.items.map((item, i) => {
        const base = VARIANTS[item.variant] ?? VARIANTS.solid;
        const style: CSSProperties = { ...base, borderRadius: radius };
        const rel = item.target === "_blank" ? "noopener noreferrer" : undefined;
        const label = (
          <>
            {item.label}
            {item.variant === "outline" ? " ↗" : ""}
          </>
        );
        // Track only on the live site, and only when an author set an event.
        if (ctx.mode === "public" && item.trackEvent) {
          return (
            <TrackedLink
              key={i}
              href={item.href}
              target={item.target}
              rel={rel}
              style={style}
              event={item.trackEvent}
              params={item.params}
            >
              {label}
            </TrackedLink>
          );
        }
        return (
          <a key={i} href={item.href} target={item.target} rel={rel} style={style}>
            {label}
          </a>
        );
      })}
    </div>
  );
}

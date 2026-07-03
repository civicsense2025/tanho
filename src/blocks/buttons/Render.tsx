import type { CSSProperties } from "react";
import { TrackedLink } from "@/components/analytics/TrackedLink";
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
        const style = VARIANTS[item.variant] ?? VARIANTS.solid;
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

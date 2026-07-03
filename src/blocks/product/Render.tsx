import type { CSSProperties } from "react";
import type { RenderCtx } from "../types";
import type { ProductContent } from "./fields";

const CTA: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "9px 18px",
  borderRadius: "var(--radius-sm)",
  fontSize: "var(--text-xs)",
  fontWeight: 500,
  lineHeight: 1,
  textDecoration: "none",
  background: "var(--solid)",
  color: "var(--text-on-accent)",
  alignSelf: "flex-start",
};

/** Static promo card — author copy only, links to the shop. */
export function RenderProduct({ content }: { content: ProductContent; ctx: RenderCtx }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        padding: "var(--space-6)",
        border: "var(--border-width) solid var(--border)",
        borderRadius: "var(--radius-md)",
        background: "var(--surface-card)",
      }}
    >
      {content.badge ? (
        <span
          style={{
            alignSelf: "flex-start",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            textTransform: "uppercase",
            letterSpacing: "var(--tracking-wide)",
            color: "var(--text-on-accent)",
            background: "var(--solid)",
            padding: "var(--space-1) var(--space-3)",
            borderRadius: "var(--radius-pill)",
          }}
        >
          {content.badge}
        </span>
      ) : null}
      {content.name ? (
        <span style={{ fontSize: "var(--text-lg)", fontWeight: 500, color: "var(--text)" }}>
          {content.name}
        </span>
      ) : null}
      <span style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
        {content.priceLabel ? (
          <span style={{ fontSize: "var(--text-lg)", color: "var(--text)" }}>
            {content.priceLabel}
          </span>
        ) : null}
        {content.was ? (
          <span
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-faint)",
              textDecoration: "line-through",
            }}
          >
            {content.was}
          </span>
        ) : null}
      </span>
      {content.note ? (
        <span
          style={{
            fontSize: "var(--text-sm)",
            lineHeight: "var(--leading-relaxed)",
            color: "var(--text-muted)",
          }}
        >
          {content.note}
        </span>
      ) : null}
      {content.cta ? (
        <a href={content.href} style={CTA}>
          {content.cta}
        </a>
      ) : null}
    </div>
  );
}

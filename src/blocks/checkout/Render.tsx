import type { CSSProperties } from "react";
import type { RenderCtx } from "../types";
import type { CheckoutContent } from "./fields";

const ROW: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "var(--space-3)",
  fontSize: "var(--text-sm)",
  color: "var(--text-muted)",
};

/** Static cart-summary CTA card — preview copy only; real cart lives at /shop. */
export function RenderCheckout({ content }: { content: CheckoutContent; ctx: RenderCtx }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        padding: "var(--space-6)",
        maxWidth: "26rem",
        border: "var(--border-width) solid var(--border)",
        borderRadius: "var(--radius-md)",
        background: "var(--surface-card)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          textTransform: "uppercase",
          letterSpacing: "var(--tracking-widest)",
          color: "var(--text-faint)",
        }}
      >
        Order summary
      </span>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {content.items.map((item, i) => (
          <div key={i} style={ROW}>
            <span>
              {item.name}
              {item.qty > 1 ? ` × ${item.qty}` : ""}
            </span>
            <span style={{ color: "var(--text)" }}>{item.price}</span>
          </div>
        ))}
      </div>

      {content.total ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            paddingTop: "var(--space-3)",
            borderTop: "var(--border-width) solid var(--line-0)",
            fontSize: "var(--text-body)",
            color: "var(--text)",
          }}
        >
          <span>Total</span>
          <span style={{ fontWeight: 500 }}>{content.total}</span>
        </div>
      ) : null}

      {content.cta ? (
        <a
          href={content.href}
          style={{
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
          }}
        >
          {content.cta}
        </a>
      ) : null}
    </div>
  );
}

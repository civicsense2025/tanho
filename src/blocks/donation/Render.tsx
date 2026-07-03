import type { RenderCtx } from "../types";
import type { DonationContent } from "./fields";

/** Static CTA card linking to /donate — same visual shape as checkout/booking cards. */
export function RenderDonation({ content }: { content: DonationContent; ctx: RenderCtx }) {
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
        Donate
      </span>
      <span style={{ fontSize: "var(--text-body)", color: "var(--text)", fontWeight: 500 }}>
        {content.heading}
      </span>
      {content.body ? (
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{content.body}</span>
      ) : null}
      <a
        href="/donate"
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
    </div>
  );
}

import type { CSSProperties } from "react";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import type { RenderCtx } from "../types";
import type { PricingContent, PricingTier } from "./fields";

/** Stripe-style tier table — author copy only. */
export function RenderPricing({ content, ctx }: { content: PricingContent; ctx: RenderCtx }) {
  if (content.tiers.length === 0) return null;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${content.tiers.length}, minmax(0, 1fr))`,
        gap: "var(--space-4)",
        alignItems: "stretch",
      }}
    >
      {content.tiers.map((tier, i) => (
        <TierCard key={i} tier={tier} mode={ctx.mode} />
      ))}
    </div>
  );
}

function TierCard({ tier, mode }: { tier: PricingTier; mode: RenderCtx["mode"] }) {
  const card: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-4)",
    padding: "var(--space-6)",
    borderRadius: "var(--radius-md)",
    border: tier.featured
      ? "var(--border-width) solid var(--accent)"
      : "var(--border-width) solid var(--border)",
    background: tier.featured ? "var(--accent-tint)" : "var(--surface-card)",
  };
  const cta: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "9px 18px",
    borderRadius: "var(--radius-sm)",
    fontSize: "var(--text-xs)",
    fontWeight: 500,
    lineHeight: 1,
    textDecoration: "none",
    marginTop: "auto",
    background: tier.featured ? "var(--solid)" : "transparent",
    color: tier.featured ? "var(--text-on-accent)" : "var(--text)",
    border: tier.featured ? "1px solid var(--solid)" : "var(--border-width) solid var(--border)",
  };

  return (
    <div style={card}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          textTransform: "uppercase",
          letterSpacing: "var(--tracking-widest)",
          color: "var(--text-faint)",
        }}
      >
        {tier.name}
      </span>
      <span style={{ display: "flex", alignItems: "baseline", gap: "var(--space-1)" }}>
        <span style={{ fontSize: "var(--text-h1)", fontWeight: 500, color: "var(--text)" }}>
          {tier.price}
        </span>
        {tier.cadence ? (
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-faint)" }}>
            {tier.cadence}
          </span>
        ) : null}
      </span>
      {tier.features.length > 0 ? (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          {tier.features.map((f, i) => (
            <li
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "var(--space-2)",
                fontSize: "var(--text-sm)",
                color: "var(--text-muted)",
              }}
            >
              <span aria-hidden style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
                ✓
              </span>
              {f}
            </li>
          ))}
        </ul>
      ) : null}
      {tier.cta ? (
        mode === "public" && tier.trackEvent ? (
          <TrackedLink href={tier.href} style={cta} event={tier.trackEvent} params={tier.params}>
            {tier.cta}
          </TrackedLink>
        ) : (
          <a href={tier.href} style={cta}>
            {tier.cta}
          </a>
        )
      ) : null}
    </div>
  );
}

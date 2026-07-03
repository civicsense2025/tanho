import type { RenderCtx } from "../types";
import { boundPlaceholder } from "../bound-common";
import type { BookingContent } from "./fields";
import type { BookingResolved } from "./resolve";

const money = (cents: number) =>
  cents === 0 ? "Free" : `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

/**
 * Booking CTA card — pure. Links into the /book flow for a featured event type
 * (or the picker when none is set). All server work is in resolve().
 */
export function RenderBooking({
  content,
  ctx,
}: {
  content: BookingContent & { _resolved?: BookingResolved | null };
  ctx: RenderCtx;
}) {
  const ph = boundPlaceholder(ctx, "Booking", content._resolved);
  if (ph) return <div style={ph.style}>{ph.label}</div>;

  const resolved = content._resolved;
  const href = resolved?.href ?? "/book";
  const event = resolved?.event ?? null;
  const heading = content.title || event?.name || "Book a time";

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
        Schedule
      </span>
      <span style={{ fontSize: "var(--text-body)", color: "var(--text)", fontWeight: 500 }}>
        {heading}
      </span>
      {event ? (
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          {event.durationMin} min · {money(event.priceCents)}
        </span>
      ) : null}
      <a
        href={href}
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

import type { RenderCtx } from "../types";
import type { TestimonialContent, TestimonialItem } from "./fields";

/** Star row for a rated testimonial (0 = hidden). */
function Stars({ n }: { n: number }) {
  if (!n) return null;
  return (
    <div aria-label={`${n} out of 5 stars`} style={{ color: "var(--accent)", fontSize: "var(--text-sm)", letterSpacing: "2px" }}>
      {"★".repeat(n)}
      <span style={{ color: "var(--border-strong)" }}>{"★".repeat(5 - n)}</span>
    </div>
  );
}

function Card({ item }: { item: TestimonialItem }) {
  return (
    <figure
      style={{
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        padding: "var(--space-5)",
        background: "var(--surface-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <Stars n={item.rating} />
      <blockquote style={{ margin: 0, fontSize: "var(--text-lg)", lineHeight: "var(--leading-snug)", color: "var(--text)" }}>
        “{item.quote}”
      </blockquote>
      <figcaption style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginTop: "auto" }}>
        {item.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- author media, unknown host/dimensions
          <img src={item.avatar} alt="" width={36} height={36} style={{ borderRadius: "var(--radius-pill)", objectFit: "cover" }} />
        ) : null}
        <div>
          <div style={{ fontWeight: "var(--weight-medium)" as never, fontSize: "var(--text-sm)" }}>{item.name}</div>
          {item.role ? <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{item.role}</div> : null}
        </div>
      </figcaption>
    </figure>
  );
}

/**
 * Testimonials with three view options — the same content laid out differently:
 *  - grid:     responsive card grid (reviews wall — the shop default)
 *  - carousel: horizontal scroll-snap strip, pure CSS/no-JS
 *  - single:   one large centered quote (a landing-page hero testimonial)
 */
export function RenderTestimonial({ content, ctx }: { content: TestimonialContent; ctx: RenderCtx }) {
  const { items, layout } = content;
  if (!items.length) return null;

  // Mobile collapses the grid to a single column (intrinsic layout, like other grids).
  const cols = ctx.device === "mobile" ? 1 : content.cols;

  if (layout === "single") {
    const it = items[0]!;
    return (
      <div style={{ maxWidth: "48rem", marginInline: "auto", textAlign: "center", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <Stars n={it.rating} />
        <blockquote style={{ margin: 0, fontSize: "var(--text-h2)", lineHeight: "var(--leading-snug)", color: "var(--text)" }}>
          “{it.quote}”
        </blockquote>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          {it.name}{it.role ? ` · ${it.role}` : ""}
        </div>
      </div>
    );
  }

  if (layout === "carousel") {
    return (
      <div style={{ display: "flex", gap: "var(--space-4)", overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: "var(--space-2)" }}>
        {items.map((item, i) => (
          <div key={i} style={{ flex: "0 0 min(80%, 22rem)", scrollSnapAlign: "start" }}>
            <Card item={item} />
          </div>
        ))}
      </div>
    );
  }

  // grid (default)
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "var(--space-4)" }}>
      {items.map((item, i) => (
        <Card key={i} item={item} />
      ))}
    </div>
  );
}

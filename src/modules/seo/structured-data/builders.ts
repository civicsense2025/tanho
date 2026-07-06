import type { SiteContext } from "../jsonld";

/**
 * Additional schema.org builders, colocated with the site-level builders
 * (see ./site.ts). The original four — article/person/creativeWork/breadcrumb —
 * still live in ../jsonld.ts and are re-exported through the module barrel; new
 * types land here so the registry can grow without churning that file.
 *
 * All builders return a plain JSON-LD object; render it through the shared
 * `<JsonLd>` component (which escapes via `safeJsonLd`) — never hand-roll a
 * <script> tag.
 */

const absUrl = (siteUrl: string, path: string): string =>
  path.startsWith("http")
    ? path
    : `${siteUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

const clean = <T extends Record<string, unknown>>(obj: T): T =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null && v !== "")) as T;

/** One offer's availability, mapped to the schema.org URL vocabulary. */
export function availabilityUrl(inStock: boolean): string {
  return inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
}

/**
 * Product — commerce items. Mirrors the schema that ProductDetail emitted
 * inline before this builder existed (name/image/sku/brand/offer), so the
 * markup is unchanged; only its source moved here.
 */
export function product(
  input: {
    name: string;
    url: string;
    images?: string[];
    sku?: string | null;
    priceCents: number;
    currency: string;
    inStock: boolean;
  },
  ctx: SiteContext,
) {
  return clean({
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    image: input.images?.length ? input.images.map((i) => absUrl(ctx.siteUrl, i)) : undefined,
    sku: input.sku || undefined,
    brand: { "@type": "Brand", name: ctx.siteName },
    offers: clean({
      "@type": "Offer",
      url: absUrl(ctx.siteUrl, input.url),
      priceCurrency: input.currency.toUpperCase(),
      price: (input.priceCents / 100).toFixed(2),
      availability: availabilityUrl(input.inStock),
    }),
  });
}

/** Event — a bookable event type (scheduling). Location is virtual unless a
 *  physical address is supplied by the caller. */
export function event(
  input: {
    name: string;
    url: string;
    description?: string;
    priceCents?: number;
    currency?: string;
  },
  ctx: SiteContext,
) {
  return clean({
    "@context": "https://schema.org",
    "@type": "Event",
    name: input.name,
    description: input.description,
    url: absUrl(ctx.siteUrl, input.url),
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    organizer: { "@type": "Organization", name: ctx.siteName, url: ctx.siteUrl },
    ...(input.priceCents != null
      ? {
          offers: clean({
            "@type": "Offer",
            url: absUrl(ctx.siteUrl, input.url),
            price: (input.priceCents / 100).toFixed(2),
            priceCurrency: (input.currency ?? "usd").toUpperCase(),
            availability: "https://schema.org/InStock",
          }),
        }
      : {}),
  });
}

/** FAQPage — a list of question/answer pairs. Answers are plain text (the
 *  caller strips any markup before passing them in). */
export function faqPage(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: { "@type": "Answer", text: it.answer },
    })),
  };
}

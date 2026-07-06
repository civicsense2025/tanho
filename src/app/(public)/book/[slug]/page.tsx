import { notFound } from "next/navigation";
import { getEventTypeBySlug } from "@/modules/scheduling/queries";
import { BookFlow } from "@/modules/scheduling/public/BookFlow";
import { buildPageMetadata, event as eventSchema, JsonLd } from "@/modules/seo";
import { getGeneralSettings } from "@/modules/settings/queries";
import { getSeoSettings } from "@/modules/seo/queries";
import { getCanonicalSiteUrl } from "@/modules/domain/queries";
import styles from "@/modules/scheduling/public/book.module.css";

const BASE_FALLBACK = process.env.APP_URL ?? "http://localhost:3000";

const money = (cents: number) =>
  cents === 0 ? "Free" : `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventTypeBySlug(slug);
  return buildPageMetadata({
    contentType: "page",
    title: event?.active ? `Book: ${event.name}` : "Book a time",
    excerpt: event?.active ? event.description || undefined : undefined,
    path: `/book/${slug}`,
  });
}

/** Date + time picker and intake for a single event type. */
export default async function BookEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventTypeBySlug(slug);
  if (!event || !event.active) notFound();

  // schema.org Event for the bookable event type. Site identity is threaded
  // from settings (cached) — never hardcoded.
  const [general, seo] = await Promise.all([getGeneralSettings(), getSeoSettings()]);
  const siteUrl = await getCanonicalSiteUrl(seo.siteUrl, BASE_FALLBACK);
  const eventLd = eventSchema(
    {
      name: event.name,
      url: `/book/${event.slug}`,
      description: event.description || undefined,
      priceCents: event.priceCents,
      currency: "usd",
    },
    { siteName: general.name, siteUrl },
  );

  return (
    <div className={styles.page}>
      <JsonLd schema={eventLd} />
      <span className={styles.eyebrow}>Schedule</span>
      <h1 className={styles.title}>{event.name}</h1>
      <p className={styles.lede}>
        {event.durationMin} min · {money(event.priceCents)}
        {event.description ? ` — ${event.description}` : ""}
      </p>
      <BookFlow
        event={{
          slug: event.slug,
          name: event.name,
          durationMin: event.durationMin,
          priceCents: event.priceCents,
          locations: event.locations,
        }}
      />
    </div>
  );
}

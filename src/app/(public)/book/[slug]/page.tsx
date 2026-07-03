import { notFound } from "next/navigation";
import { getEventTypeBySlug } from "@/modules/scheduling/queries";
import { BookFlow } from "@/modules/scheduling/public/BookFlow";
import styles from "@/modules/scheduling/public/book.module.css";

const money = (cents: number) =>
  cents === 0 ? "Free" : `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventTypeBySlug(slug);
  return { title: event?.active ? `Book: ${event.name}` : "Book a time" };
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

  return (
    <div className={styles.page}>
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

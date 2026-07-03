import type { EventTypeRow } from "../queries";
import styles from "./book.module.css";

const money = (cents: number) =>
  cents === 0 ? "Free" : `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

/** Active event-type picker — the entry point of the public booking flow. */
export function EventPicker({ events }: { events: EventTypeRow[] }) {
  return (
    <div className={styles.page}>
      <span className={styles.eyebrow}>Schedule</span>
      <h1 className={styles.title}>Book a time</h1>
      {events.length === 0 ? (
        <p className={styles.empty}>No event types are open for booking right now.</p>
      ) : (
        <div className={styles.grid}>
          {events.map((e) => (
            <a key={e.id} href={`/book/${e.slug}`} className={styles.card}>
              <span className={styles.dot} aria-hidden />
              <span className={styles.cardName}>{e.name}</span>
              <span className={styles.cardMeta}>
                {e.durationMin} min · {money(e.priceCents)}
              </span>
              {e.description ? (
                <span className={styles.cardMeta}>{e.description}</span>
              ) : null}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

import type { EntryRow } from "../schema";
import type { HubData } from "@/entities/schemas/hub";
import styles from "./entries-public.module.css";

/** The /guides landing: a card per published hub with its live guide count. */
export async function HubsDirectory({
  hubs,
  countsByHub,
}: {
  hubs: EntryRow[];
  countsByHub: Record<string, number>;
}) {
  return (
    <div>
      <header className={styles.hero}>
        <h1 className={styles.heroHeading}>Guides</h1>
        <p className={styles.heroIntro}>
          Practical, step-by-step paths to owning more of your digital life — one
          category at a time.
        </p>
      </header>

      <div className={styles.cardGrid}>
        {hubs.map((hub) => {
          const data = hub.data as HubData;
          const count = countsByHub[hub.slug] ?? 0;
          return (
            <a key={hub.id} className={styles.card} href={`/guides/${hub.slug}`}>
              <span className={styles.cardTitle}>{hub.title}</span>
              {data.tagline ? (
                <span className={styles.cardTagline}>{data.tagline}</span>
              ) : null}
              <span className={styles.cardMeta}>
                {count === 0 ? "Coming soon" : `${count} guides`}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

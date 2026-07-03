import type { EntryRow } from "../schema";
import type { HubData } from "@/entities/schemas/hub";
import type { GuideData } from "@/entities/schemas/guide";
import { GuideMeta } from "./GuideMeta";
import styles from "./entries-public.module.css";

/** A single hub's page: hero plus a grid of its published guides. */
export async function HubList({ hub, guides }: { hub: EntryRow; guides: EntryRow[] }) {
  const hubData = hub.data as HubData;

  return (
    <div>
      <header className={styles.hero}>
        <h1 className={styles.heroHeading}>{hub.title}</h1>
        {hubData.tagline ? <p className={styles.heroIntro}>{hubData.tagline}</p> : null}
      </header>

      {guides.length === 0 ? (
        <p className={styles.empty}>No guides published yet.</p>
      ) : (
        <div className={styles.cardGrid}>
          {guides.map((guide) => {
            const data = guide.data as GuideData;
            return (
              <a
                key={guide.id}
                className={styles.card}
                href={`/guides/${hub.slug}/${guide.slug}`}
              >
                <span className={styles.cardTitle}>{guide.title}</span>
                {data.tagline ? (
                  <span className={styles.cardTagline}>{data.tagline}</span>
                ) : null}
                <GuideMeta data={data} />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

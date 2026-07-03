import Link from "next/link";
import type { EntryRow } from "../schema";
import type { ResourceData } from "@/entities/schemas/resource";
import styles from "./entries-public.module.css";

/**
 * The /resources index. Callers pass only public + published rows.
 * internal_notes and is_public are never rendered here.
 */
export async function ResourcesIndex({ resources }: { resources: EntryRow[] }) {
  return (
    <div>
      <header className={styles.hero}>
        <h1 className={styles.heroHeading}>Resources</h1>
        <p className={styles.heroIntro}>
          Tools, docs, and references worth keeping close as you take back control.
        </p>
      </header>

      <div className={styles.resourceList}>
        {resources.map((entry) => {
          const data = entry.data as ResourceData;
          const body = (
            <span>
              <span className={styles.resourceHead}>
                <span className={styles.resourceTitle}>{entry.title}</span>
                {data.source_name ? (
                  <span className={styles.resourceSource}>{data.source_name}</span>
                ) : null}
                <span className={styles.resourceType}>{data.resource_type}</span>
              </span>
              {data.summary ? (
                <span className={styles.resourceSummary}>{data.summary}</span>
              ) : null}
            </span>
          );

          if (data.resource_type === "interactive") {
            // In-app interactive resources link to their internal route.
            return data.internal_route ? (
              <Link key={entry.id} className={styles.resourceRow} href={data.internal_route}>
                {body}
                <span aria-hidden className={styles.glyph}>
                  →
                </span>
              </Link>
            ) : (
              <span key={entry.id} className={styles.resourceRow}>
                {body}
                <span />
              </span>
            );
          }

          return data.url ? (
            <a
              key={entry.id}
              className={styles.resourceRow}
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {body}
              <span aria-hidden className={styles.glyph}>
                ↗
              </span>
            </a>
          ) : (
            <span key={entry.id} className={styles.resourceRow}>
              {body}
              <span />
            </span>
          );
        })}
      </div>
    </div>
  );
}

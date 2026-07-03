import type { EntryRow } from "../schema";
import { getPublishedEntryBlocks } from "../queries";
import { RenderBlocks } from "@/blocks/renderer/BlockRenderer";
import type { ProjectData } from "@/entities/schemas/project";
import styles from "./entries-public.module.css";

/** Public detail page for a published project. */
export async function ProjectDetail({ entry }: { entry: EntryRow }) {
  const data = entry.data as ProjectData;
  const blocks = await getPublishedEntryBlocks("project", entry.id);
  const hasLinks = Boolean(data.live_url) || Boolean(data.github_url);

  return (
    <article>
      <header className={styles.header}>
        <h1 className={styles.title}>{entry.title}</h1>
        {data.tagline ? <p className={styles.tagline}>{data.tagline}</p> : null}
        {data.year ? <span className={styles.year}>{data.year}</span> : null}
        {hasLinks ? (
          <div className={styles.headerLinks}>
            {data.live_url ? (
              <a
                className={styles.extLink}
                href={data.live_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Live site
                <span aria-hidden className={styles.glyph}>
                  ↗
                </span>
              </a>
            ) : null}
            {data.github_url ? (
              <a
                className={styles.extLink}
                href={data.github_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Source
                <span aria-hidden className={styles.glyph}>
                  ↗
                </span>
              </a>
            ) : null}
          </div>
        ) : null}
      </header>
      <RenderBlocks blocks={blocks} />
    </article>
  );
}

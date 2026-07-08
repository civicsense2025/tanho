import type { EntryRow } from "../schema";
import { getPublishedEntryBlocks } from "../queries";
import { RenderBlocks } from "@/blocks/renderer/BlockRenderer";
import { CUSTOM_SCOPE_CLASS } from "@/lib/css-sanitizer";
import { entryPageCtx } from "./entry-page-ctx";
import { creativeWork } from "@/modules/seo/jsonld";
import { JsonLd } from "@/modules/seo/JsonLdScript";
import type { ProjectData } from "@/entities/schemas/project";
import styles from "./entries-public.module.css";

/** Public detail page for a published project. */
export async function ProjectDetail({ entry }: { entry: EntryRow }) {
  const data = entry.data as ProjectData;
  const blocks = await getPublishedEntryBlocks("project", entry.id);
  const hasLinks = Boolean(data.live_url) || Boolean(data.github_url);
  // Same page-level block context the page route threads: anchor ids, TOC
  // outline, and (only when a breadcrumbs block exists) a breadcrumb trail —
  // so structural blocks work inside entry bodies instead of vanishing.
  // Fetch the page context once (settings reads are cached): it supplies both
  // the entity's canonical URL + site identity for the JSON-LD and the
  // breadcrumb trail.
  const pageCtx = await entryPageCtx("project", entry);
  // Activate the dormant creativeWork() builder: a project advertises as
  // schema.org CreativeWork.
  const jsonLd = pageCtx
    ? creativeWork(
      {
        title: entry.title,
        tagline: data.tagline || undefined,
        year: data.year || undefined,
        url: pageCtx.route,
        tags: data.tags,
      },
      { siteName: pageCtx.siteName, siteUrl: pageCtx.siteUrl },
    )
    : undefined;

  return (
    <article className={CUSTOM_SCOPE_CLASS}>
      {jsonLd ? <JsonLd schema={jsonLd} /> : null}
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

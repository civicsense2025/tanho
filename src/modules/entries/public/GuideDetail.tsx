import type { EntryRow } from "../schema";
import { getPublishedEntryBlocks, listPublishedEntries } from "../queries";
import { RenderBlocks } from "@/blocks/renderer/BlockRenderer";
import { CUSTOM_SCOPE_CLASS } from "@/lib/css-sanitizer";
import { entryPageCtx } from "./entry-page-ctx";
import { article } from "@/modules/seo/jsonld";
import { JsonLd } from "@/modules/seo/JsonLdScript";
import type { GuideData } from "@/entities/schemas/guide";
import type { ResourceData } from "@/entities/schemas/resource";
import { GuideMeta } from "./GuideMeta";
import styles from "./entries-public.module.css";

/** Public detail page for a published guide within a hub. */
export async function GuideDetail({ entry, hub }: { entry: EntryRow; hub: EntryRow }) {
  const data = entry.data as GuideData;
  const blocks = await getPublishedEntryBlocks("guide", entry.id);
  // Thread the same page-level block context the page route provides, so
  // structural blocks (TOC, breadcrumbs) work inside guide bodies too. Fetch it
  // once (settings reads are cached): it supplies the canonical URL + site
  // identity for the JSON-LD and, when a breadcrumbs block exists, the trail.
  const pageCtx = await entryPageCtx("guide", entry, [
    { title: hub.title, route: `/guides/${hub.slug}` },
  ]);
  // Activate the dormant article() builder: a guide is long-form how-to
  // content → schema.org Article. summary falls back to the tagline.
  const jsonLd = pageCtx
    ? article(
      {
        title: entry.title,
        summary: data.summary || data.tagline || undefined,
        url: pageCtx.route,
      },
      { siteName: pageCtx.siteName, siteUrl: pageCtx.siteUrl },
    )
    : undefined;

  // Resolve cited resources to PUBLIC + published rows only. A non-public
  // resource must never surface here, even if referenced by slug.
  const wanted = new Set(data.resource_slugs);
  const furtherReading =
    wanted.size > 0
      ? (await listPublishedEntries("resource")).filter(
        (r) => (r.data as ResourceData).is_public === true && wanted.has(r.slug),
      )
      : [];

  return (
    <article className={CUSTOM_SCOPE_CLASS}>
      {jsonLd ? <JsonLd schema={jsonLd} /> : null}
      <header className={styles.header}>
        <a className={styles.backLink} href={`/guides/${hub.slug}`}>
          <span aria-hidden className={styles.glyph}>
            ←
          </span>
          {hub.title}
        </a>
        <h1 className={styles.title}>{entry.title}</h1>
        {data.tagline ? <p className={styles.tagline}>{data.tagline}</p> : null}
        <GuideMeta data={data} />
      </header>

      {data.skills_required.length > 0 ? (
        <section className={styles.section}>
          <div className={styles.sectionLabel}>Skills required</div>
          <ul className={styles.list}>
            {data.skills_required.map((skill) => (
              <li key={skill} className={styles.listItem}>
                <span aria-hidden className={styles.marker}>
                  ·
                </span>
                <span>{skill}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.requirements.length > 0 ? (
        <section className={styles.section}>
          <div className={styles.sectionLabel}>Requirements</div>
          <ul className={styles.list}>
            {data.requirements.map((req) => (
              <li key={req} className={styles.listItem}>
                <span aria-hidden className={styles.marker}>
                  ▸
                </span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <RenderBlocks blocks={blocks} />

      {furtherReading.length > 0 ? (
        <section className={styles.section}>
          <div className={styles.sectionLabel}>Further reading</div>
          <div className={styles.readingList}>
            {furtherReading.map((r) => {
              const rd = r.data as ResourceData;
              return rd.url ? (
                <a
                  key={r.id}
                  className={styles.readingRow}
                  href={rd.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>
                    <span className={styles.readingSource}>
                      {rd.source_name || r.title}
                    </span>
                    <span className={styles.readingType}>{rd.resource_type}</span>
                  </span>
                  <span aria-hidden className={styles.glyph}>
                    ↗
                  </span>
                </a>
              ) : (
                <span key={r.id} className={styles.readingRow}>
                  <span>
                    <span className={styles.readingSource}>
                      {rd.source_name || r.title}
                    </span>
                    <span className={styles.readingType}>{rd.resource_type}</span>
                  </span>
                  <span />
                </span>
              );
            })}
          </div>
        </section>
      ) : null}
    </article>
  );
}

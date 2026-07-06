import type { RenderCtx } from "../types";
import { boundPlaceholder } from "../bound-common";
import type { RelatedContentContent } from "./fields";
import type { RelatedItem } from "./resolve";
import styles from "./related-content.module.css";

/**
 * Related-content grid — cards linking to published entries of a chosen type,
 * resolved server-side (bound block). Crawlable: real `<a>` links in the
 * server HTML. Emits a semantic labelled `<section>` + `<ul role="list">`.
 */
export function RenderRelatedContent({
  content,
  ctx,
}: {
  content: RelatedContentContent & { _resolved?: RelatedItem[] | null };
  ctx: RenderCtx;
}) {
  const ph = boundPlaceholder(ctx, "Related content", content._resolved);
  if (ph) return <div style={ph.style}>{ph.label}</div>;

  const items = content._resolved;
  if (!items || items.length === 0) return null;

  const title = content.title.trim();
  const headingId = title ? "related-heading" : undefined;
  // Configurable so the block fits its surrounding document outline (avoids
  // an h2-under-h3 heading-level skip when nested in a subsection).
  const Heading = content.headingLevel;

  return (
    <section
      className={styles.section}
      aria-labelledby={headingId}
      aria-label={title ? undefined : "Related content"}
    >
      {title ? (
        <Heading id={headingId} className={styles.title}>
          {title}
        </Heading>
      ) : null}
      <ul className={styles.grid} role="list" style={{ ["--rc-cols" as never]: content.cols }}>
        {items.map((item) => (
          <li key={item.href}>
            <a className={styles.card} href={item.href}>
              <span className={styles.cardTitle}>{item.title}</span>
              {item.subtitle ? <span className={styles.cardSubtitle}>{item.subtitle}</span> : null}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

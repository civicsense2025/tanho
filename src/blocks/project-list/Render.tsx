import type { RenderCtx } from "../types";
import { boundPlaceholder } from "../bound-common";
import type { ProjectListContent } from "./fields";
import type { ProjectListItem } from "./resolve";
import styles from "./project-list.module.css";

/** Hairline-divided project rows; each row links to its detail page. */
export function RenderProjectList({
  content,
  ctx,
}: {
  content: ProjectListContent & { _resolved?: ProjectListItem[] | null };
  ctx: RenderCtx;
}) {
  const ph = boundPlaceholder(ctx, "Project list", content._resolved);
  if (ph) return <div style={ph.style}>{ph.label}</div>;

  const items = content._resolved;
  if (!items || items.length === 0) return null;

  return (
    <div className={styles.list}>
      {content.eyebrow ? <div className={styles.eyebrow}>{content.eyebrow}</div> : null}
      {items.map((item) => (
        <a key={item.href} href={item.href} className={styles.row}>
          <span>
            <span className={styles.title}>{item.title}</span>
            {item.tagline ? <span className={styles.tagline}>{item.tagline}</span> : null}
          </span>
          {item.year ? <span className={styles.year}>{item.year}</span> : <span />}
          <span aria-hidden className={styles.arrow}>
            →
          </span>
        </a>
      ))}
    </div>
  );
}

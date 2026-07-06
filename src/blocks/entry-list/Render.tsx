import type { RenderCtx } from "../types";
import { boundPlaceholder } from "../bound-common";
import type { EntryListContent } from "./fields";
import type { EntryListItem } from "./resolve";
import styles from "./entry-list.module.css";

/** A card grid of a content type's published rows, each linking to its detail page. */
export function RenderEntryList({
  content,
  ctx,
}: {
  content: EntryListContent & { _resolved?: EntryListItem[] | null };
  ctx: RenderCtx;
}) {
  const ph = boundPlaceholder(ctx, "Entry list", content._resolved);
  if (ph) return <div style={ph.style}>{ph.label}</div>;

  const items = content._resolved;
  if (!items || items.length === 0) return null;

  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <a key={item.href} href={item.href} className={styles.card}>
          <span className={styles.title}>{item.title}</span>
          {item.subtitle ? <span className={styles.subtitle}>{item.subtitle}</span> : null}
        </a>
      ))}
    </div>
  );
}

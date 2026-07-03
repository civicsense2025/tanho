import type { RenderCtx } from "../types";
import { boundPlaceholder } from "../bound-common";
import type { PostlistContent } from "./fields";
import type { PostlistItem } from "./resolve";
import styles from "./postlist.module.css";

/** Issue archive rows — date (mono), title, excerpt, lock glyph when gated. */
export function RenderPostlist({
  content,
  ctx,
}: {
  content: PostlistContent & { _resolved?: PostlistItem[] | null };
  ctx: RenderCtx;
}) {
  const ph = boundPlaceholder(ctx, "Post list", content._resolved);
  if (ph) return <div style={ph.style}>{ph.label}</div>;

  const items = content._resolved;
  if (!items || items.length === 0) return null;

  return (
    <div className={styles.list}>
      {items.map((item) => (
        <a key={item.href} href={item.href} className={styles.row}>
          <span className={styles.date}>{item.date}</span>
          <span className={styles.main}>
            <span className={styles.title}>
              {item.locked ? (
                <span className={styles.lock} aria-label="Members only">
                  ▸{" "}
                </span>
              ) : null}
              {item.title}
            </span>
            {item.excerpt ? <span className={styles.excerpt}>{item.excerpt}</span> : null}
          </span>
        </a>
      ))}
    </div>
  );
}

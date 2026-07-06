import type { RenderCtx } from "../types";
import { ChromeLink } from "../ChromeLink";
import type { FooterColumnContent } from "./fields";
import type { FooterColumnResolved } from "./resolve";
import styles from "./column.module.css";

/** A titled column of footer links resolved from a saved menu. Pure. */
export function RenderFooterColumn({ content }: { content: FooterColumnContent; ctx: RenderCtx }) {
  const items = (content as { _resolved?: FooterColumnResolved })._resolved?.items ?? [];
  if (items.length === 0 && !content.title) return null;
  return (
    <div className={styles.col}>
      {content.title ? <span className={styles.title}>{content.title}</span> : null}
      {items.map((item) => (
        <ChromeLink key={item.id} href={item.href} className={styles.link}>
          {item.label}
        </ChromeLink>
      ))}
    </div>
  );
}

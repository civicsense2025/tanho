import type { RenderCtx } from "../types";
import { ChromeLink } from "../ChromeLink";
import type { SocialLinksContent } from "./fields";
import type { SocialLinksResolved } from "./resolve";
import styles from "./social.module.css";

const ALIGN: Record<SocialLinksContent["align"], string> = {
  left: styles.left,
  center: styles.center,
  right: styles.right,
};

/** A row of social/label links resolved from a saved menu. Pure. */
export function RenderSocialLinks({ content }: { content: SocialLinksContent; ctx: RenderCtx }) {
  const items = (content as { _resolved?: SocialLinksResolved })._resolved?.items ?? [];
  if (items.length === 0) return null;
  return (
    <div className={`${styles.social} ${ALIGN[content.align]}`}>
      {items.map((item) => (
        <ChromeLink key={item.id} href={item.href} className={styles.link}>
          {item.label}
        </ChromeLink>
      ))}
    </div>
  );
}

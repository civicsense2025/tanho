import type { MenuItem } from "@/modules/menus/validation";
import type { FooterConfig } from "../validation";
import { SmartLink } from "./SmartLink";
import styles from "./footer.module.css";

export type FooterColumnData = { title: string; items: MenuItem[] };

/** Social links as quiet uppercase text (labels come from the social menu). */
export function SocialRow({ items }: { items: MenuItem[] }) {
  if (!items.length) return null;
  return (
    <div className={styles.social}>
      {items.map((item) => (
        <SmartLink key={item.id} href={item.href} className={styles.socialLink}>
          {item.label}
        </SmartLink>
      ))}
    </div>
  );
}

/** One footer menu column: mono title + stacked links (children flattened). */
export function MenuColumn({ col }: { col: FooterColumnData }) {
  const flat = col.items.flatMap((item) => [item, ...(item.children ?? [])]);
  return (
    <div className={styles.col}>
      {col.title ? <span className={`${styles.colTitle} ${styles.muted}`}>{col.title}</span> : null}
      {flat.map((item) => (
        <SmartLink key={item.id} href={item.href} className={styles.colLink}>
          {item.label}
        </SmartLink>
      ))}
    </div>
  );
}

/** Subscribe mini-band; wires to the newsletter module when it lands. */
export function NewsletterMini({ config }: { config: FooterConfig["newsletter"] }) {
  return (
    <div className={styles.news}>
      <span className={`${styles.colTitle} ${styles.muted}`}>{config.title || "Newsletter"}</span>
      {config.body ? <p className={styles.newsBody}>{config.body}</p> : null}
      <div className={styles.newsForm}>
        <input className={styles.newsInput} type="email" placeholder="Email" aria-label="Email" />
        <span className={styles.newsBtn}>{config.cta || "Subscribe"}</span>
      </div>
    </div>
  );
}

/** Decorative payment-badge placeholders (real badges ship with commerce). */
export function BadgeRow() {
  return (
    <span className={styles.badges} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className={styles.badge}>
          ···
        </span>
      ))}
    </span>
  );
}

/** Statement-size site name row. */
export function GiantWordmark({ name }: { name: string }) {
  return <div className={styles.wordmark}>{name}</div>;
}

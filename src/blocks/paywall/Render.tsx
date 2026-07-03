import type { RenderCtx } from "../types";
import type { PaywallContent } from "./fields";
import styles from "./paywall.module.css";

/**
 * The paywall banner shown at the cut line. The GATING (hiding blocks after
 * it) happens in the walker, not here — this component only draws the wall.
 */
export function RenderPaywall({ content }: { content: PaywallContent; ctx: RenderCtx }) {
  return (
    <aside className={styles.paywall} aria-label="Members-only content">
      <span className={styles.lock} aria-hidden>
        ▸
      </span>
      <h2 className={styles.title}>{content.title}</h2>
      {content.body ? <p className={styles.body}>{content.body}</p> : null}
      <a className={styles.cta} href={content.ctaHref}>
        {content.cta}
      </a>
      {content.note ? <p className={styles.note}>{content.note}</p> : null}
    </aside>
  );
}

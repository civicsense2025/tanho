import type { RenderCtx } from "../types";
import type { SearchTriggerContent } from "./fields";
import styles from "./search-trigger.module.css";

/**
 * Header/footer search box — a plain native GET form to /search. No
 * client-island needed (unlike newsletter's SubscribeForm): search is pure
 * navigation with no mutation to await, so a native form submission is
 * simpler AND more correct here (works with JS disabled, no extra bundle).
 */
export function RenderSearchTrigger({ content }: { content: SearchTriggerContent; ctx: RenderCtx }) {
  return (
    <form action="/search" method="get" className={styles.form} role="search">
      <input
        type="search"
        name="q"
        placeholder={content.placeholder}
        aria-label={content.ariaLabel}
        className={styles.input}
      />
      <button type="submit" className={styles.submit} aria-label={content.ariaLabel}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <line x1="11" y1="11" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </form>
  );
}

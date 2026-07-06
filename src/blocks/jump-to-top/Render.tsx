import type { RenderCtx } from "../types";
import type { JumpToTopContent } from "./fields";
import styles from "./jump-to-top.module.css";

/**
 * Back-to-top button. CSS-first: a plain `<a href="#top">` anchoring to the
 * page's `<main id="top">`, so it works with zero JS (and smooth-scrolls when a
 * TOC has opted the page into smooth scrolling). The shared island reveals it
 * only past `showAfter` px; with no JS it stays visible and functional.
 */
export function RenderJumpToTop({
  content,
}: {
  content: JumpToTopContent;
  ctx: RenderCtx;
}) {
  const cls = [styles.btn, styles[content.align]].filter(Boolean).join(" ");
  return (
    <a
      className={cls}
      href="#top"
      data-jump-top={content.showAfter}
      aria-label={content.label}
      title={content.label}
    >
      <span className={styles.glyph} aria-hidden="true">
        ↑
      </span>
    </a>
  );
}

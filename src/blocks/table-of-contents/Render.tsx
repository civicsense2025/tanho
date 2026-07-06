import { EDITOR_PLACEHOLDER_STYLE } from "../bound-common";
import type { RenderCtx } from "../types";
import type { TableOfContentsContent } from "./fields";
import styles from "./toc.module.css";

const LEVEL_NUM: Record<string, number> = { h1: 1, h2: 2, h3: 3, h4: 4 };

/**
 * Table of contents — a jump-link list generated from the page's heading
 * outline (`ctx.outline`, computed once by the page route). CSS-first and
 * crawlable: renders complete anchor links server-side that work with zero JS;
 * the optional active-section highlight is layered on by the shared client
 * island via the `data-toc-link` / `data-toc-target` hooks. A bound resolver
 * can't see sibling headings, which is why the outline arrives via ctx.
 */
export function RenderTableOfContents({
  content,
  ctx,
}: {
  content: TableOfContentsContent;
  ctx: RenderCtx;
}) {
  const outline = ctx.outline ?? [];
  const highlightActive = content.highlightActive;
  const min = LEVEL_NUM[content.minLevel] ?? 2;
  const max = LEVEL_NUM[content.maxLevel] ?? 3;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const items = outline.filter((h) => h.level >= lo && h.level <= hi);

  if (items.length === 0) {
    // In the editor, ALWAYS show a quiet placeholder when there's nothing to
    // list (no outline threaded, no headings yet, or none in the level range)
    // — otherwise the block would vanish from the canvas and be unselectable.
    if (ctx.mode === "editor") {
      return (
        <div style={EDITOR_PLACEHOLDER_STYLE}>
          Table of contents — lists this page&apos;s headings
        </div>
      );
    }
    // On the public site: nothing to link, render nothing.
    return null;
  }

  const listClass = [
    styles.list,
    content.marker === "numbered" ? styles.listNumbered : "",
    content.marker === "bulleted" ? styles.listBulleted : "",
  ]
    .filter(Boolean)
    .join(" ");

  const list = (
    <ol className={listClass}>
      {items.map((h, i) => (
        <li key={h.id} className={styles.item} style={{ ["--toc-depth" as never]: h.level - lo }}>
          <a
            className={styles.link}
            href={`#${h.id}`}
            data-toc-link={h.id}
            data-toc-level={h.level}
            // Server-render the first item as active. This matches the scroll-spy
            // island's own "first heading is active until you scroll past one"
            // rule, so the SSR HTML and the client's initial state agree — no
            // hydration mismatch — and it's the correct pre-JS/no-JS state too.
            // The island only *moves* aria-current as sections scroll by.
            {...(highlightActive && i === 0 ? { "aria-current": "location" as const } : {})}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ol>
  );

  const navClass = [styles.nav, content.sticky ? styles.sticky : ""].filter(Boolean).join(" ");
  const title = content.title.trim();

  return (
    // `data-toc-smooth` opts this page into smooth anchor scrolling — the shared
    // island sets `scroll-behavior:smooth` on <html> when present, so jumps
    // glide without forcing it site-wide. `scroll-margin-top` on headings
    // (added by RenderHeading) keeps the landing clear of a sticky header.
    <nav
      className={navClass}
      aria-label={title || "Table of contents"}
      data-toc
      {...(highlightActive ? { "data-toc-spy": "" } : {})}
      {...(content.smoothScroll ? { "data-toc-smooth": "" } : {})}
    >
      {content.collapsible ? (
        <details className={styles.details} open>
          <summary className={styles.title}>{title || "On this page"}</summary>
          {list}
        </details>
      ) : (
        <>
          {title ? <p className={styles.title}>{title}</p> : null}
          {list}
        </>
      )}
    </nav>
  );
}

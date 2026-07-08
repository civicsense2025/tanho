import type { BlockNode, RenderCtx } from "../types";
import type { SiteHeaderContent } from "./fields";
import type { SiteHeaderResolved } from "./resolve";
import { VisitorThemeToggle } from "@/components/public/VisitorThemeToggle";
import styles from "./header.module.css";

/**
 * Site header — the sticky `<header>` landmark holding the chrome sub-blocks.
 * Pure container: children render via ctx.children.
 *
 * `--header-height` is NOT published here: the blocks that consume it
 * (heading/section scroll-margin, under-header reading-progress, sticky TOC)
 * are page content siblings of `<header>`, not its descendants, so a variable
 * set on `<header>` never reaches them. The public layout publishes it on the
 * shell wrapper (their common ancestor) via `headerHeightVar` instead.
 */
export function RenderSiteHeader({
  content,
  ctx,
}: {
  content: SiteHeaderContent & { _resolved?: SiteHeaderResolved | null };
  ctx: RenderCtx;
}) {
  const kids = (content.blocks as BlockNode[]) ?? [];
  const sidebar = content.layout === "sidebar";
  const overlay = content.transparentOnHero;
  // Two-tier is orthogonal to spread/center/split/stack, but (like the old
  // recipes) never combines with sidebar — a full-height column has no "above
  // the main bar" to add a strip to.
  const utilityText = content.twoTier && !sidebar ? content._resolved?.utilityText : "";
  // Sidebar is a full-height column, not a scrolling top bar — sticky/blur
  // and the transparent-over-hero overlay don't apply to it.
  const cls = [
    styles.bar,
    sidebar ? styles.sidebarBar : "",
    content.sticky && !overlay && !sidebar ? styles.sticky : "",
    overlay && !sidebar ? styles.overlay : "",
  ]
    .filter(Boolean)
    .join(" ");

  // The `stack` layout splits the first child (logo) onto its own centered row
  // above the rest; `sidebar` does the same but stacked vertically the full
  // column height (nav expected to be a vertical nav-menu variant); every
  // other layout renders children inline in one row.
  const inner =
    (content.layout === "stack" || content.layout === "sidebar") && kids.length > 0 ? (
      <>
        <div>{ctx.children(kids.slice(0, 1))}</div>
        <div className={styles.stackRest}>{ctx.children(kids.slice(1))}</div>
      </>
    ) : (
      ctx.children(kids)
    );

  return (
    <header className={cls}>
      {utilityText ? (
        <div className={styles.tier}>
          <span>{utilityText}</span>
        </div>
      ) : null}
      <div className={`${styles.main} ${styles[content.layout] ?? ""}`}>{inner}</div>
      {content.showThemeToggle && ctx.mode === "public" ? (
        <div className={styles.themeToggle}>
          <VisitorThemeToggle />
        </div>
      ) : null}
    </header>
  );
}

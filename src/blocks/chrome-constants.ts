/**
 * Chrome layer constants — the sticky/overlay stack order, shared by the
 * chrome blocks (site-header, announcement, nav-menu drawers). Kept here as
 * named constants (not scattered magic numbers) so the layer order stays
 * legible and self-consistent when several chrome blocks sit on one page.
 *
 * Ported from the config-driven chrome's CSS z-index ladder:
 *   announcement 50  >  header 40 ;  mobile drawers 90  >  dropdown panels 80.
 * (Announcement sits above the header so it's never covered when both are
 * sticky; drawers/overlays sit above everything so an open menu is on top.)
 */
export const Z = {
  header: 40,
  announcement: 50,
  dropdown: 50,
  mobilePanel: 80,
  mobileDrawer: 90,
} as const;

/**
 * Default rendered height of the sticky site header, published as the
 * `--header-height` CSS custom property on the header wrapper. Phase 1 added
 * `scroll-margin-top: var(--header-height, 0px)` on headings/sections and an
 * `under-header` reading-progress position — both fall back to 0 until a
 * header publishes a real value. A no-JS constant (matching the header bar's
 * min-height + border) is the crawlable, hydration-free way to publish it.
 */
export const HEADER_HEIGHT = "61px";

/**
 * Extra height the two-tier utility strip adds above the main bar (measured:
 * a two-tier header renders ~88px total vs. the plain 61px — see
 * site-header/header.module.css's `.tier`). Added to HEADER_HEIGHT when
 * `twoTier` is set, so scroll-margin/reading-progress still line up under
 * the taller bar instead of drifting by the strip's height.
 */
export const TWO_TIER_EXTRA_HEIGHT = 27;

type HeaderTree = ReadonlyArray<{ type: string; content?: unknown }>;

const siteHeaderOf = (headerTree: HeaderTree) => headerTree.find((b) => b.type === "site-header");

/**
 * Does the published header tree use the `sidebar` layout — a full-height
 * left column rather than a horizontal top bar? The public shell branches on
 * this to switch from the default stacked layout to a side-by-side one (see
 * app/(public)/layout.tsx). Kept dependency-free (walks the tree shape) for
 * the same reason as headerHeightVar below.
 */
export function isSidebarHeader(headerTree: HeaderTree): boolean {
  const header = siteHeaderOf(headerTree);
  return (header?.content as { layout?: string } | undefined)?.layout === "sidebar";
}

/**
 * Effective `--header-height` for a published header block tree, to be set on
 * the shell wrapper (an ANCESTOR of the page content) — NOT on the `<header>`
 * itself, whose subtree does not include the page blocks that consume it
 * (heading/section scroll-margin, under-header reading-progress, sticky TOC).
 * Those blocks are siblings of `<header>` under the shell, so the variable only
 * reaches them when it's published on the common ancestor.
 *
 * Returns `0px` when there is no header, the header is an overlay
 * (transparent-on-hero) header that takes no layout height, or the header
 * uses the `sidebar` layout — a full-height side column has no fixed bar
 * height for scroll-margin/reading-progress to offset against, unlike the
 * horizontal layouts. Otherwise the constant bar height, plus
 * TWO_TIER_EXTRA_HEIGHT when the header's utility strip is showing (`twoTier`
 * true — this never combines with `sidebar`, see site-header/Render.tsx).
 * Kept dependency-free (walks the tree shape) so the layout needn't import
 * the site-header schema.
 */
export function headerHeightVar(headerTree: HeaderTree): string {
  const header = siteHeaderOf(headerTree);
  if (!header) return "0px";
  const c = header.content as { transparentOnHero?: boolean; layout?: string; twoTier?: boolean } | undefined;
  if (c?.transparentOnHero || c?.layout === "sidebar") return "0px";
  const base = parseInt(HEADER_HEIGHT, 10);
  return c?.twoTier ? `${base + TWO_TIER_EXTRA_HEIGHT}px` : HEADER_HEIGHT;
}

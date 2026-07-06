import type { CSSProperties, ReactNode } from "react";
import { RenderBlocks } from "@/blocks/renderer/BlockRenderer";
import { getPublishedChrome } from "@/modules/chrome/queries";
import { headerHeightVar, isSidebarHeader } from "@/blocks/chrome-constants";
import { PageviewBeacon } from "@/components/analytics/PageviewBeacon";
import { WebVitalsBeacon } from "@/components/analytics/WebVitalsBeacon";
import { BlockEnhancements } from "@/blocks/client/enhancements";
import { SiteJsonLd } from "@/modules/seo";
import styles from "./shell.module.css";

/**
 * Public chrome shell: the published `chrome:header` block tree above every
 * page, the `chrome:footer` tree below — rendered through the ONE block walker
 * (RenderBlocks), exactly like page content. Header/footer are now first-class
 * blocks (nav-menu owns the sticky/mobile nav), so this file no longer knows
 * anything about layouts/recipes/configs — EXCEPT the `sidebar` header layout,
 * which changes the page SHELL itself (header beside content, not above it),
 * not just the header bar's own internal arrangement.
 *
 * `--header-height` is published HERE, on the shell wrapper, because the blocks
 * that consume it (heading/section scroll-margin, under-header reading-progress,
 * sticky TOC) are the page content in `div.grow` — siblings of `<header>`, not
 * its descendants. A custom property only inherits DOWN, so setting it on the
 * shell (their common ancestor) is the only place it actually reaches them.
 * (A sidebar header publishes 0px here — see headerHeightVar — since its full
 * height doesn't apply to scroll-margin the way a horizontal bar's does.)
 *
 * Both trees resolve their own bound sub-blocks (logo → site name, nav-menu →
 * menu items) inside the walker. Missing/unseeded owners render nothing.
 *
 * The `<BlockEnhancements/>` client island + `<PageviewBeacon/>` are preserved.
 */
export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [header, footer] = await Promise.all([
    getPublishedChrome("chrome:header"),
    getPublishedChrome("chrome:footer"),
  ]);
  const shellVars = { ["--header-height" as never]: headerHeightVar(header) } as CSSProperties;

  if (isSidebarHeader(header)) {
    return (
      <div className={styles.shell} style={shellVars}>
        <SiteJsonLd />
        <PageviewBeacon />
        <WebVitalsBeacon />
        <BlockEnhancements />
        <div className={styles.withSidebar}>
          <RenderBlocks blocks={header} />
          <div className={styles.sidebarContent}>
            <div className={styles.grow}>{children}</div>
            <RenderBlocks blocks={footer} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell} style={shellVars}>
      <SiteJsonLd />
      <PageviewBeacon />
      <WebVitalsBeacon />
      <BlockEnhancements />
      <RenderBlocks blocks={header} />
      <div className={styles.grow}>{children}</div>
      <RenderBlocks blocks={footer} />
    </div>
  );
}

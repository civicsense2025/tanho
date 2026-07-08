import { z } from "zod";
import { childBlocksSchema, commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

/**
 * Site header — the sticky `<header>` landmark that holds the chrome sub-blocks
 * (logo / nav-menu / cta-button / announcement) as children. Replaces the
 * config-driven header + ChromeHeader. A nestable CONTAINER; it also publishes
 * the `--header-height` CSS var on the shell so anchor scroll-margins and the
 * `under-header` reading-progress bar line up.
 */
export const siteHeaderSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  /** Pin to the top of the viewport on scroll (translucent, blurred). */
  sticky: z.boolean().default(true),
  /** How children are arranged across the bar. `split` centres the middle
   *  slot; `stack` drops the nav to a centred row below (editorial); `sidebar`
   *  turns the whole header into a full-height left column (the public shell
   *  detects this and switches to the side-by-side page layout). */
  layout: z.enum(["spread", "center", "split", "stack", "sidebar"]).default("spread"),
  /** Transparent bar over a hero (no background/border until scrolled). */
  transparentOnHero: z.boolean().default(false),
  /** Adds a thin utility strip above the main bar (ported from the old
   *  "two-tier" recipes — a slim, muted, small-caps line, not a second full
   *  row of content). Orthogonal to `layout`: combines with any of the
   *  non-sidebar arrangements above. */
  twoTier: z.boolean().default(false),
  /** Text for the utility strip. Empty = fall back to the site's general
   *  tagline at render time (resolved server-side into `_resolved.utilityText`,
   *  the same white-label pattern logo/site-footer use — a brand default is
   *  never stored in the tree). Only rendered when `twoTier` is true. */
  utilityText: z.string().max(120).default(""),
  /** Show a light/dark/system theme toggle in the header (public site only).
   *  Visitors can flip the site's appearance; their choice is persisted via a
   *  cookie so SSR picks it up with no flash. */
  showThemeToggle: z.boolean().default(false),
  blocks: childBlocksSchema.default([]),
});

export type SiteHeaderContent = z.infer<typeof siteHeaderSchema>;

export const makeSiteHeader = (): SiteHeaderContent =>
  siteHeaderSchema.parse({ sticky: true, layout: "spread", transparentOnHero: false, blocks: [] });

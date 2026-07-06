import { z } from "zod";
import { childBlocksSchema, commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

/**
 * Site footer — the `<footer>` landmark that holds the chrome sub-blocks
 * (logo / footer-column / social-links / cta-button) as children. Replaces the
 * config-driven footer + ChromeFooter. A nestable CONTAINER.
 *
 * The old footer's dark presets used HARDCODED HEX; this uses semantic tokens
 * (`dark` → paper-on-ink surface) so it theme-tracks (theming.md: tokens only).
 */
export const siteFooterSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  /** Layout of the child cells across the footer. */
  layout: z.enum(["columns", "centered", "split"]).default("columns"),
  /** Inverted (paper-on-ink) surface — the token-driven successor to the old
   *  hardcoded dark/contrast footer palette. */
  dark: z.boolean().default(false),
  /** Auto copyright line at the bottom: "© {year} {site name}". Empty text
   *  uses the derived line; a non-empty override is shown verbatim. */
  copyright: z.string().max(160).default(""),
  blocks: childBlocksSchema.default([]),
});

export type SiteFooterContent = z.infer<typeof siteFooterSchema>;

export const makeSiteFooter = (): SiteFooterContent =>
  siteFooterSchema.parse({ layout: "columns", dark: false, copyright: "", blocks: [] });

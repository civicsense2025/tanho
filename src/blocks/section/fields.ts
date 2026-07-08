import { z } from "zod";
import { childBlocksSchema, commonContent, layoutStyleContent, customCssContent, motionContent } from "../common";

export const sectionSchema = z.object({
  ...commonContent,
  ...layoutStyleContent,
  ...customCssContent,
  ...motionContent,
  width: z.enum(["contained", "full"]).default("contained"),
  background: z.enum(["none", "surface", "tint", "tint2", "ink"]).default("none"),
  py: z.enum(["none", "sm", "md", "lg", "xl"]).default("lg"),
  /** Optional anchor id so this section is deep-linkable (#id) and can appear
   *  as a jump target. Slug-shaped only (a–z, 0–9, hyphens) — the render
   *  re-slugifies defensively so nothing unsafe reaches the id attribute. */
  anchorId: z
    .string()
    .max(80)
    .regex(/^[a-z0-9-]*$/, "Lowercase letters, digits and hyphens only")
    .default(""),
  /** Per-section theme mode override. `inherit` (default) follows the page/site
   *  mode; `light`/`dark` forces this section to render in that mode regardless
   *  of the visitor's preference — useful for dark hero bands on light pages or
   *  vice versa. Implemented via a scoped `data-theme` attribute on the
   *  <section> element, which the CSS token cascade picks up. */
  themeMode: z.enum(["inherit", "light", "dark"]).default("inherit"),
  blocks: childBlocksSchema.default([]),
});

export type SectionContent = z.infer<typeof sectionSchema>;

export const makeSection = (): SectionContent =>
  sectionSchema.parse({ width: "contained", background: "none", py: "lg", blocks: [] });

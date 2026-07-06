import type { BlockDef } from "../types";
import { siteHeaderSchema, makeSiteHeader } from "./fields";
import { RenderSiteHeader } from "./Render";

export const siteHeaderDef: BlockDef<typeof siteHeaderSchema> = {
  type: "site-header",
  category: "chrome",
  label: "Site header",
  icon: "layout-top",
  blurb: "Sticky header bar — holds logo, nav, CTA",
  schema: siteHeaderSchema,
  make: makeSiteHeader,
  Render: RenderSiteHeader,
  nestable: true,
  // Resolver (two-tier utility-strip text, falling back to the site tagline)
  // registered in resolvers.ts; def stays static so all fields remain
  // editable (the `table` pattern, same as site-footer).
};

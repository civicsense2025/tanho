import type { BlockDef } from "../types";
import { siteFooterSchema, makeSiteFooter } from "./fields";
import { RenderSiteFooter } from "./Render";

export const siteFooterDef: BlockDef<typeof siteFooterSchema> = {
  type: "site-footer",
  category: "chrome",
  label: "Site footer",
  icon: "layout-bottom",
  blurb: "Footer — holds columns, social, logo",
  schema: siteFooterSchema,
  make: makeSiteFooter,
  Render: RenderSiteFooter,
  nestable: true,
  // Resolver (siteName + year for the copyright) registered in resolvers.ts;
  // def stays static so layout/dark/copyright remain editable (the `table` pattern).
};

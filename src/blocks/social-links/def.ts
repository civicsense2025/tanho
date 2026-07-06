import type { BlockDef } from "../types";
import { socialLinksSchema, makeSocialLinks } from "./fields";
import { RenderSocialLinks } from "./Render";

export const socialLinksDef: BlockDef<typeof socialLinksSchema> = {
  type: "social-links",
  category: "chrome",
  label: "Social links",
  icon: "share",
  blurb: "Row of social links from a menu",
  schema: socialLinksSchema,
  make: makeSocialLinks,
  Render: RenderSocialLinks,
  // Resolver registered in resolvers.ts; def stays static so menuId/align remain
  // editable in the inspector (the `table`-style pattern).
};

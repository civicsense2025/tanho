import type { BlockDef } from "../types";
import { footerColumnSchema, makeFooterColumn } from "./fields";
import { RenderFooterColumn } from "./Render";

export const footerColumnDef: BlockDef<typeof footerColumnSchema> = {
  type: "footer-column",
  category: "chrome",
  label: "Footer column",
  icon: "list",
  blurb: "Titled column of links from a menu",
  schema: footerColumnSchema,
  make: makeFooterColumn,
  Render: RenderFooterColumn,
  // Resolver registered in resolvers.ts; def stays static so title/menuId remain
  // editable in the inspector (the `table`-style pattern).
};

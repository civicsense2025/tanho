import type { BlockDef } from "../types";
import { breadcrumbsSchema, makeBreadcrumbs } from "./fields";
import { RenderBreadcrumbs } from "./Render";

export const breadcrumbsDef: BlockDef<typeof breadcrumbsSchema> = {
  type: "breadcrumbs",
  category: "content",
  label: "Breadcrumbs",
  icon: "chevron-right",
  blurb: "Trail from the page's parent hierarchy",
  schema: breadcrumbsSchema,
  make: makeBreadcrumbs,
  Render: RenderBreadcrumbs,
};

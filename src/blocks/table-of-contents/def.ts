import type { BlockDef } from "../types";
import { makeTableOfContents, tableOfContentsSchema } from "./fields";
import { RenderTableOfContents } from "./Render";

export const tableOfContentsDef: BlockDef<typeof tableOfContentsSchema> = {
  type: "table-of-contents",
  category: "content",
  label: "Table of contents",
  icon: "list",
  blurb: "Auto-generated from the page's headings",
  schema: tableOfContentsSchema,
  make: makeTableOfContents,
  Render: RenderTableOfContents,
};

import type { BlockDef } from "../types";
import { makeRichtext, richtextSchema } from "./fields";
import { RenderRichtext } from "./Render";

export const richtextDef: BlockDef<typeof richtextSchema> = {
  type: "richtext",
  category: "content",
  label: "Rich text",
  icon: "text",
  blurb: "Markdown prose paragraph block",
  schema: richtextSchema,
  make: makeRichtext,
  Render: RenderRichtext,
};

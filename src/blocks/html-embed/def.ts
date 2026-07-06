import type { BlockDef } from "../types";
import { makeHtmlEmbed, htmlEmbedSchema } from "./fields";
import { RenderHtmlEmbed } from "./Render";

export const htmlEmbedDef: BlockDef<typeof htmlEmbedSchema> = {
  type: "html-embed",
  category: "media",
  label: "HTML embed",
  icon: "html-embed",
  blurb: "Paste any embed code (sanitised)",
  schema: htmlEmbedSchema,
  make: makeHtmlEmbed,
  Render: RenderHtmlEmbed,
};

import type { BlockDef } from "../types";
import { makeQuote, quoteSchema } from "./fields";
import { RenderQuote } from "./Render";

export const quoteDef: BlockDef<typeof quoteSchema> = {
  type: "quote",
  category: "content",
  label: "Quote",
  icon: "quote",
  blurb: "Pull quote with attribution",
  schema: quoteSchema,
  make: makeQuote,
  Render: RenderQuote,
};

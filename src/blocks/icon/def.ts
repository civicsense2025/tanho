import type { BlockDef } from "../types";
import { iconSchema, makeIcon } from "./fields";
import { RenderIcon } from "./Render";

export const iconDef: BlockDef<typeof iconSchema> = {
  type: "icon",
  category: "content",
  label: "Icon",
  icon: "icon",
  blurb: "A standalone icon or emoji glyph",
  schema: iconSchema,
  make: makeIcon,
  Render: RenderIcon,
};

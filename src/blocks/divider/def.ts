import type { BlockDef } from "../types";
import { dividerSchema, makeDivider } from "./fields";
import { RenderDivider } from "./Render";

export const dividerDef: BlockDef<typeof dividerSchema> = {
  type: "divider",
  category: "layout",
  label: "Divider",
  icon: "divider",
  blurb: "Hairline rule",
  schema: dividerSchema,
  make: makeDivider,
  Render: RenderDivider,
};

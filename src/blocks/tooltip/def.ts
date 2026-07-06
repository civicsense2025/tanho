import type { BlockDef } from "../types";
import { makeTooltip, tooltipSchema } from "./fields";
import { RenderTooltip } from "./Render";

export const tooltipDef: BlockDef<typeof tooltipSchema> = {
  type: "tooltip",
  category: "content",
  label: "Tooltip",
  icon: "tooltip",
  blurb: "Hover or focus hint on a word",
  schema: tooltipSchema,
  make: makeTooltip,
  Render: RenderTooltip,
};

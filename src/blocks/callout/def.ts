import type { BlockDef } from "../types";
import { calloutSchema, makeCallout } from "./fields";
import { RenderCallout } from "./Render";

export const calloutDef: BlockDef<typeof calloutSchema> = {
  type: "callout",
  category: "content",
  label: "Callout",
  icon: "callout",
  blurb: "Tinted note — info, tip, warning, danger",
  schema: calloutSchema,
  make: makeCallout,
  Render: RenderCallout,
};

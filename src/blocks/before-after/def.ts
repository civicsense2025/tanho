import type { BlockDef } from "../types";
import { makeBeforeAfter, beforeAfterSchema } from "./fields";
import { RenderBeforeAfter } from "./Render";

export const beforeAfterDef: BlockDef<typeof beforeAfterSchema> = {
  type: "before-after",
  category: "media",
  label: "Before / After",
  icon: "before-after",
  blurb: "Draggable image comparison slider",
  schema: beforeAfterSchema,
  make: makeBeforeAfter,
  Render: RenderBeforeAfter,
};

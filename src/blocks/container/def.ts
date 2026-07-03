import type { BlockDef } from "../types";
import { containerSchema, makeContainer } from "./fields";
import { RenderContainer } from "./Render";

export const containerDef: BlockDef<typeof containerSchema> = {
  type: "container",
  category: "layout",
  label: "Container",
  icon: "container",
  blurb: "Centered width-constrained wrapper",
  schema: containerSchema,
  make: makeContainer,
  Render: RenderContainer,
  nestable: true,
};

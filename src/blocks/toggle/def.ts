import type { BlockDef } from "../types";
import { makeToggle, toggleSchema } from "./fields";
import { RenderToggle } from "./Render";

export const toggleDef: BlockDef<typeof toggleSchema> = {
  type: "toggle",
  category: "content",
  label: "Toggle",
  icon: "toggle",
  blurb: "Two-option segmented control — pricing, plans",
  schema: toggleSchema,
  make: makeToggle,
  Render: RenderToggle,
};

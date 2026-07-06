import type { BlockDef } from "../types";
import { fieldSchema, makeFieldBlock } from "./fields";
import { RenderField } from "./Render";

export const fieldDef: BlockDef<typeof fieldSchema> = {
  type: "field",
  category: "dynamic",
  label: "Field",
  icon: "text",
  blurb: "A content-type field (e.g. price) from the current row",
  schema: fieldSchema,
  make: makeFieldBlock,
  Render: RenderField,
  bound: true,
  suggestedFor: ["*"],
};

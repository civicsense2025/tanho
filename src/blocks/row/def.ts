import type { BlockDef } from "../types";
import { makeRow, rowSchema } from "./fields";
import { RenderRow } from "./Render";

export const rowDef: BlockDef<typeof rowSchema> = {
  type: "row",
  category: "layout",
  label: "Row",
  icon: "row",
  blurb: "Side-by-side grid of blocks",
  schema: rowSchema,
  make: makeRow,
  Render: RenderRow,
  nestable: true,
  responsive: true,
};

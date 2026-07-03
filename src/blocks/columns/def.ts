import type { BlockDef } from "../types";
import { columnsSchema, makeColumns } from "./fields";
import { RenderColumns } from "./Render";

export const columnsDef: BlockDef<typeof columnsSchema> = {
  type: "columns",
  category: "layout",
  label: "Columns",
  icon: "columns",
  blurb: "Column grid with a stack breakpoint",
  schema: columnsSchema,
  make: makeColumns,
  Render: RenderColumns,
  nestable: true,
  responsive: true,
};

import type { BlockDef } from "../types";
import { makeTable, tableSchema } from "./fields";
import { RenderTable } from "./Render";

export const tableDef: BlockDef<typeof tableSchema> = {
  type: "table",
  category: "data",
  label: "Table",
  icon: "table",
  blurb: "Hairline data table",
  schema: tableSchema,
  make: makeTable,
  Render: RenderTable,
};

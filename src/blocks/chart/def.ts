import type { BlockDef } from "../types";
import { chartSchema, makeChart } from "./fields";
import { RenderChart } from "./Render";

export const chartDef: BlockDef<typeof chartSchema> = {
  type: "chart",
  category: "data",
  label: "Chart",
  icon: "chart",
  blurb: "Bar, line or donut chart",
  schema: chartSchema,
  make: makeChart,
  Render: RenderChart,
};

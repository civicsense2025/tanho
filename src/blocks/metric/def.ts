import type { BlockDef } from "../types";
import { makeMetric, metricSchema } from "./fields";
import { RenderMetric } from "./Render";

export const metricDef: BlockDef<typeof metricSchema> = {
  type: "metric",
  category: "data",
  label: "Metrics",
  icon: "metric",
  blurb: "Big-number stat grid",
  schema: metricSchema,
  make: makeMetric,
  Render: RenderMetric,
  responsive: true,
};

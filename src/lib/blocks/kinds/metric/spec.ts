import { z } from "zod";
import { defineBlock } from "../../core/defineBlock";

const schema = z.object({
  metrics: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
});

export type MetricContent = z.infer<typeof schema>;

export const metricSpec = defineBlock({
  type: "metric",
  kind: "content",
  label: "Metrics",
  category: "data",
  schema,
  // Matches the old DEFAULT_CONTENT.metric (one empty row).
  defaultContent: { metrics: [{ label: "", value: "" }] },
  variants: [
    { id: "auto", label: "Auto columns", description: "2 or 3 columns based on count (default)" },
    { id: "grid-2", label: "2 columns" },
    { id: "grid-3", label: "3 columns" },
    { id: "grid-4", label: "4 columns" },
  ],
  styleCaps: { align: true, width: true, padding: true, columns: true },
});

import { MetricGrid, type Metric } from "@/components/ui";
import type { MetricBlockContent } from "../types";

export function MetricRenderer({ content }: { content: MetricBlockContent }) {
  const metrics = (content.metrics as Metric[]) || [];
  return <MetricGrid metrics={metrics} columns={metrics.length >= 3 ? 3 : 2} />;
}

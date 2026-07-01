import { MetricGrid, type Metric } from "@/components/ui";
import type { MetricBlockContent } from "../types";

/** Column resolution: explicit style.columns wins, then a grid-N variant, else the historical
 * auto heuristic (3 columns when there are ≥3 metrics, otherwise 2) — so an unstyled metric
 * block renders exactly as before. */
function resolveColumns(count: number, variant?: string, columns?: number): number {
  if (columns) return columns;
  if (variant === "grid-2") return 2;
  if (variant === "grid-3") return 3;
  if (variant === "grid-4") return 4;
  return count >= 3 ? 3 : 2; // "auto" / unset
}

export function MetricRenderer({
  content,
  variant,
  columns,
}: {
  content: MetricBlockContent;
  variant?: string;
  columns?: number;
}) {
  const metrics = (content.metrics as Metric[]) || [];
  return <MetricGrid metrics={metrics} columns={resolveColumns(metrics.length, variant, columns)} />;
}

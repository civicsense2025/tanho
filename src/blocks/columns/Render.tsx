import type { BlockNode, RenderCtx } from "../types";
import type { ColumnsContent } from "./fields";

/**
 * Effective column count per device: always stack on mobile; `stackAt:
 * "tablet"` stacks on tablet too, otherwise tablet caps at two columns.
 */
function colsFor(content: ColumnsContent, device: RenderCtx["device"]): number {
  if (device === "mobile") return 1;
  if (device === "tablet") {
    return content.stackAt === "tablet" ? 1 : Math.min(content.cols, 2);
  }
  return content.cols;
}

/** Column grid — children are typically container blocks, one per column. */
export function RenderColumns({ content, ctx }: { content: ColumnsContent; ctx: RenderCtx }) {
  const cols = colsFor(content, ctx.device);
  return (
    <div
      style={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: "var(--space-6)",
        alignItems: "stretch",
      }}
    >
      {ctx.children(content.blocks as BlockNode[], { horizontal: true })}
    </div>
  );
}

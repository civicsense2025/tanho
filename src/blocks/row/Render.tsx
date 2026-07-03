import type { BlockNode, RenderCtx } from "../types";
import type { RowContent } from "./fields";

const GAP: Record<string, string> = {
  sm: "var(--space-3)",
  md: "var(--space-6)",
  lg: "var(--space-10)",
};

/** Equal-column grid; collapses to a single column on mobile. */
export function RenderRow({ content, ctx }: { content: RowContent; ctx: RenderCtx }) {
  const cols = ctx.device === "mobile" ? 1 : content.cols;
  return (
    <div
      style={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: GAP[content.gap] ?? GAP.md,
        alignItems: content.align,
      }}
    >
      {ctx.children(content.blocks as BlockNode[], { horizontal: true })}
    </div>
  );
}

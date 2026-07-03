import type { BlockNode, RenderCtx } from "../types";
import type { ContainerContent } from "./fields";

const MAX_W: Record<string, string> = {
  content: "var(--width-content)",
  prose: "var(--width-prose)",
  full: "none",
};

/** Centered width-constrained wrapper for child blocks. */
export function RenderContainer({ content, ctx }: { content: ContainerContent; ctx: RenderCtx }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: MAX_W[content.maxWidth] ?? MAX_W.content,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
      }}
    >
      {ctx.children(content.blocks as BlockNode[])}
    </div>
  );
}

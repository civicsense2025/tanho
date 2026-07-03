import type { RenderCtx } from "../types";
import type { DividerContent } from "./fields";

/** Hairline rule between blocks. */
export function RenderDivider({ content }: { content: DividerContent; ctx: RenderCtx }) {
  return (
    <hr
      style={{
        margin: 0,
        border: "none",
        borderTop:
          content.style === "dotted"
            ? "1px dotted var(--border-strong)"
            : "1px solid var(--border)",
      }}
    />
  );
}

import type { RenderCtx } from "../types";
import type { SymbolContent } from "./fields";

/**
 * Placeholder Render for a symbol instance.
 *
 * A symbol is NOT rendered through this component in normal operation — the walker
 * (BlockRenderer) intercepts `type === "symbol"` and expands the saved definition
 * tree BEFORE reaching here (see Phase 2: symbol render expansion). This component
 * only shows if expansion is bypassed (e.g. a stale render path), so it renders a
 * quiet, non-breaking placeholder rather than nothing.
 */
export function RenderSymbol({ content }: { content: SymbolContent; ctx: RenderCtx }) {
  return (
    <div
      data-block="symbol"
      data-symbol-id={content.symbolId || undefined}
      style={{
        padding: "var(--space-4)",
        border: "1px dashed var(--border-strong)",
        borderRadius: "var(--radius-sm)",
        color: "var(--text-faint)",
        fontSize: "var(--text-sm)",
      }}
    >
      {content._label ? `Symbol: ${content._label}` : "Saved block"}
    </div>
  );
}

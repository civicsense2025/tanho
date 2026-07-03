import { SPACE_PX } from "../layout";
import type { BlockNode, RenderCtx } from "../types";
import type { SectionContent } from "./fields";

const BG: Record<string, { background?: string; color?: string }> = {
  none: {},
  surface: { background: "var(--surface)" },
  tint: { background: "var(--accent-tint)" },
  tint2: { background: "var(--accent-2-tint)" },
  ink: { background: "var(--solid)", color: "var(--text-on-accent)" },
};

/** Full-width band that holds child blocks — the outermost layout unit. */
export function RenderSection({ content, ctx }: { content: SectionContent; ctx: RenderCtx }) {
  const pad = SPACE_PX[content.py] ?? SPACE_PX.lg;
  return (
    <section
      style={{
        ...BG[content.background],
        paddingTop: pad,
        paddingBottom: pad,
        marginInline: content.width === "full" ? "calc(var(--pb-gutter, 0px) * -1)" : 0,
        paddingInline: content.width === "full" ? "var(--pb-gutter, 0px)" : 0,
        borderRadius: content.width === "full" ? 0 : "var(--radius-sm)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        {ctx.children(content.blocks as BlockNode[])}
      </div>
    </section>
  );
}

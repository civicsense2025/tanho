import { RenderContentBlock } from "@/lib/blocks/core/RenderBlock";
import type { StyleProps } from "@/lib/blocks/core/style-schema";
import type { Block } from "@/lib/blocks/types";

interface BlockTreeItem {
  id: string | number;
  type: Block["type"];
  content: Record<string, unknown>;
  style?: StyleProps;
  variant?: string;
}

/** Renders a list of content blocks through the unified RenderBlock façade (which applies any
 * per-block style/variant via BlockShell). The outer flex column is unchanged, so an unstyled
 * block tree renders exactly as before. */
export function BlockTree({ blocks }: { blocks: BlockTreeItem[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
      {blocks.map((block) => (
        <RenderContentBlock
          key={String(block.id)}
          block={{ type: block.type, content: block.content, style: block.style, variant: block.variant }}
        />
      ))}
    </div>
  );
}

import { blockRenderers } from "@/lib/blocks/renderers";
import type { Block } from "@/lib/blocks/types";

interface BlockTreeItem {
  id: string | number;
  type: Block["type"];
  content: Record<string, unknown>;
}

/** Renders a list of blocks via the shared block-type registry, replacing the
 * inline if-chain that used to live directly in the public project page. */
export function BlockTree({ blocks }: { blocks: BlockTreeItem[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
      {blocks.map((block) => {
        const Renderer = blockRenderers[block.type];
        if (!Renderer) return null;
        return <Renderer key={block.id} content={block.content} />;
      })}
    </div>
  );
}

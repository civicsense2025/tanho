import { homepageBlockRenderers, type HomepageBlockType } from "./registry";
import { BlockShell } from "@/lib/blocks/core/BlockShell";
import type { ValidatedBlock } from "@/lib/blocks/core/validate";

/** Renders the homepage's data-bound block tree from validated blocks. Each renderer is an
 * async Server Component (it queries its own data), so this stays a server-only path and can't
 * reuse the client-reachable BlockTree. For data-bound blocks, the validated `content` carries
 * the renderer's props. Blocks may optionally carry `style` (applied via BlockShell); without
 * it, output is unchanged. Unknown types render nothing. */
export function HomepageBlockTree({ blocks }: { blocks: ValidatedBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        const Renderer = homepageBlockRenderers[block.type as HomepageBlockType];
        if (!Renderer) return null;
        return (
          <BlockShell key={i} style={block.style}>
            <Renderer {...block.content} />
          </BlockShell>
        );
      })}
    </>
  );
}

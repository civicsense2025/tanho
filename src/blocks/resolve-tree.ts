import { blockResolvers } from "./resolvers";
import { isContainer, kidsOf } from "./tree";
import type { BlockNode } from "./types";

/**
 * Pre-resolve every bound block in a tree, server-side, for the editor.
 *
 * `resolve()` is server-only, so the client page builder can't fetch live CMS
 * data itself. Instead the page-edit route runs this over the draft blocks and
 * injects each bound block's data into `content._resolved` — the exact field
 * the block's `Render` reads on the public site. With it populated, the editor
 * canvas draws the real block design instead of a placeholder. (Blocks the user
 * adds later in the client have no `_resolved` and fall back to the placeholder
 * until the next save round-trips through the server.)
 *
 * Returns a deep copy with `_resolved` set; the input is not mutated. Recurses
 * into nested layout blocks (section/row/columns/container).
 */
export async function resolveBoundBlocks(blocks: BlockNode[]): Promise<BlockNode[]> {
  return Promise.all(blocks.map(resolveOne));
}

async function resolveOne(block: BlockNode): Promise<BlockNode> {
  const content: Record<string, unknown> = { ...block.content };

  if (isContainer(block)) {
    content.blocks = await resolveBoundBlocks(kidsOf(block));
  }

  const resolve = blockResolvers[block.type];
  if (resolve) {
    try {
      content._resolved = await resolve(content);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[blocks] editor resolve failed for ${block.type}`, err);
      }
      content._resolved = null;
    }
  }

  return { ...block, content };
}

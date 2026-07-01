import { homepageBlockRenderers, type HomepageBlock } from "./registry";

/** Renders the homepage's block tree via the data-bound block registry. Each
 * renderer is itself an async Server Component (it queries its own data), so
 * this can't reuse the plain BlockTree used for case-study blocks -- React
 * handles awaiting async components in JSX for us, we just need to select
 * the right one per block. */
export function HomepageBlockTree({ blocks }: { blocks: HomepageBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        const Renderer = homepageBlockRenderers[block.type];
        if (!Renderer) return null;
        return <Renderer key={i} {...block.props} />;
      })}
    </>
  );
}

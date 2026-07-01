import { blockRenderers } from "../renderers";
import { BlockShell } from "./BlockShell";
import type { StyleProps } from "./style-schema";

/**
 * Renders a single CONTENT block (inline content, e.g. text/image/gallery) through the shared
 * content-renderer map, threaded with optional variant/columns and wrapped in BlockShell for
 * style. Server-safe AND client-safe: it imports ONLY the content renderers, never the
 * data-bound homepage registry — that separation is load-bearing, because BlockTree (which uses
 * this) is reachable from the client PreviewFrame, and the homepage blocks pull DB drivers
 * (fs/net/dns) that must never enter a client bundle.
 *
 * Data-bound homepage blocks have their own server-only path (HomepageBlockTree) precisely so
 * their async/DB-querying renderers never transit this client-reachable module.
 */
export interface ContentBlock {
  type: string;
  content: Record<string, unknown>;
  style?: StyleProps;
  variant?: string;
}

export function RenderContentBlock({ block }: { block: ContentBlock }) {
  const Renderer = blockRenderers[block.type as keyof typeof blockRenderers];
  if (!Renderer) return null;
  return (
    <BlockShell style={block.style}>
      <Renderer content={block.content} variant={block.variant} columns={block.style?.columns} />
    </BlockShell>
  );
}

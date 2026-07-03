import type { ReactNode } from "react";
import { blockDef } from "../registry";
import { blockResolvers } from "../resolvers";
import { paywallSchema } from "../paywall/fields";
import { viewerPassesPaywall } from "../paywall/gate";
import type { BlockNode, Device, RenderViewer } from "../types";

/**
 * The one block walker — used by the public site and (with editor chrome
 * injected separately) the admin preview.
 *
 * SECURITY: paywall gating happens HERE, at the sibling level, before any
 * later block is rendered or serialized. When the walker meets a paywall the
 * viewer can't pass, it emits the paywall banner and STOPS — every block
 * after it (in this sibling list) is never touched, so gated content cannot
 * appear in the HTML or the RSC payload for an unauthorized viewer.
 */
export function RenderBlocks({
  blocks,
  device = "desktop",
  mode = "public",
  viewer = null,
}: {
  blocks: BlockNode[];
  device?: Device;
  mode?: "public" | "editor";
  viewer?: RenderViewer;
}): ReactNode {
  const out: ReactNode[] = [];
  for (const b of blocks) {
    // In the editor everything renders (authors must see gated content).
    if (mode === "public" && b.type === "paywall") {
      const parsed = paywallSchema.safeParse(b.content);
      const content = parsed.success ? parsed.data : paywallSchema.parse({});
      if (!viewerPassesPaywall(viewer, content)) {
        out.push(
          <RenderBlock key={b.id} block={b} device={device} mode={mode} viewer={viewer} />,
        );
        // Cut line: withhold every remaining sibling.
        return out;
      }
      // Member passes — drop the banner, keep rendering the rest.
      continue;
    }
    out.push(
      <RenderBlock key={b.id} block={b} device={device} mode={mode} viewer={viewer} />,
    );
  }
  return out;
}

export async function RenderBlock({
  block,
  device,
  mode,
  viewer,
}: {
  block: BlockNode;
  device: Device;
  mode: "public" | "editor";
  viewer: RenderViewer;
}) {
  const def = blockDef(block.type);
  if (!def) return null;

  const parsed = def.schema.safeParse(block.content);
  if (!parsed.success) {
    // Fail closed: never render a block whose content doesn't validate.
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[blocks] invalid ${block.type} content`, parsed.error.issues[0]);
    }
    return null;
  }
  const content = parsed.data as Record<string, unknown> & { hideOn?: Device[] };
  if (content.hideOn?.includes(device)) return null;

  // Bound blocks resolve on the server; anything failing resolves to null
  // and the block renders its own empty state. Resolvers live in a server-only
  // registry (not on `def`) so the client editor never imports them.
  const resolve = blockResolvers[block.type];
  if (resolve) {
    try {
      content._resolved = await resolve(content);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[blocks] resolve failed for ${block.type}`, err);
      }
      content._resolved = null;
    }
  }

  const ctx = {
    mode,
    device,
    viewer,
    children: (kids: BlockNode[]) => (
      <RenderBlocks blocks={kids} device={device} mode={mode} viewer={viewer} />
    ),
  };
  return <div data-block={block.type}>{def.Render({ content, ctx })}</div>;
}

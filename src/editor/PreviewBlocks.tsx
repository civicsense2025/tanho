"use client";

import { blockDef } from "@/blocks/registry";
import { UnsupportedBlock } from "@/blocks/UnsupportedBlock";
import type { BlockNode, Device } from "@/blocks/types";

/**
 * Read-only client render of a block tree for the stacked layout's live
 * preview — pure `def.Render`, no selection chrome or toolbars. Bound blocks
 * show a placeholder (their data resolves server-side on the published page),
 * mirroring the canvas.
 */
export function PreviewBlocks({ blocks, device }: { blocks: BlockNode[]; device: Device }) {
  return (
    <>
      {blocks.map((b) => (
        <PreviewBlock key={b.id} block={b} device={device} />
      ))}
    </>
  );
}

function PreviewBlock({ block, device }: { block: BlockNode; device: Device }) {
  const def = blockDef(block.type);
  if (!def) return <UnsupportedBlock type={block.type} />;
  const parsed = def.schema.safeParse(block.content);
  if (!parsed.success) return null;
  const ctx = {
    mode: "editor" as const,
    device,
    viewer: null,
    children: (kids: BlockNode[]) => <PreviewBlocks blocks={kids} device={device} />,
  };
  // Bound blocks draw their real design from the pre-resolved data too; the
  // schema strips `_resolved` on parse, so re-attach it from the raw content.
  const raw = block.content as Record<string, unknown>;
  const content =
    raw._resolved === undefined
      ? parsed.data
      : { ...(parsed.data as Record<string, unknown>), _resolved: raw._resolved };
  return <div>{def.Render({ content, ctx })}</div>;
}

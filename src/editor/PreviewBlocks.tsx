"use client";

import { blockDef } from "@/blocks/registry";
import { UnsupportedBlock } from "@/blocks/UnsupportedBlock";
import { buildOutline } from "@/modules/pages/outline";
import type { BlockNode, Device, OutlineHeadingCtx } from "@/blocks/types";
import type { BlockStyle, BlockLayout } from "@/blocks/common";
import { resolveBlockPreviewWrapper } from "./blockPreviewStyle";

/**
 * Read-only client render of a block tree for the stacked layout's live
 * preview — pure `def.Render`, no selection chrome or toolbars. Bound blocks
 * show a placeholder (their data resolves server-side on the published page),
 * mirroring the canvas.
 *
 * The anchor map + heading outline are computed ONCE from the root tree
 * (buildOutline is pure, so it's client-safe) and threaded down the
 * recursion — never recomputed per subtree, or nested headings would get
 * wrong dedup suffixes. This keeps preview heading ids identical to the
 * published page and lets the table-of-contents block preview its real list.
 */
export function PreviewBlocks({
  blocks,
  device,
  anchors,
  outline,
}: {
  blocks: BlockNode[];
  device: Device;
  /** Threaded on recursion; computed from `blocks` at the root when absent. */
  anchors?: Record<string, string>;
  outline?: OutlineHeadingCtx[];
}) {
  let a = anchors;
  let o = outline;
  if (a === undefined) {
    const built = buildOutline(blocks);
    a = built.byBlockId;
    o = built.headings;
  }
  return (
    <>
      {blocks.map((b) => (
        <PreviewBlock key={b.id} block={b} device={device} anchors={a} outline={o} />
      ))}
    </>
  );
}

function PreviewBlock({
  block,
  device,
  anchors,
  outline,
}: {
  block: BlockNode;
  device: Device;
  anchors: Record<string, string>;
  outline?: OutlineHeadingCtx[];
}) {
  const def = blockDef(block.type);
  if (!def) return <UnsupportedBlock type={block.type} />;
  const parsed = def.schema.safeParse(block.content);
  if (!parsed.success) return null;
  const ctx = {
    mode: "editor" as const,
    device,
    viewer: null,
    anchors,
    outline,
    children: (kids: BlockNode[]) => (
      <PreviewBlocks blocks={kids} device={device} anchors={anchors} outline={outline} />
    ),
  };
  // Bound blocks draw their real design from the pre-resolved data too; the
  // schema strips `_resolved` on parse, so re-attach it from the raw content.
  const raw = block.content as Record<string, unknown>;
  const content =
    raw._resolved === undefined
      ? parsed.data
      : { ...(parsed.data as Record<string, unknown>), _resolved: raw._resolved };
  // Same page-unique anchor stamping as the server walker, so preview ids
  // (and duplicate-heading dedup suffixes) match the published page.
  const anchorId = anchors[block.id];
  if (anchorId) (content as { _anchorId?: string })._anchorId = anchorId;

  // Mirrors BlockRenderer's data-block wrapper (padding/colour/border inline,
  // flex/grid via a scoped <style>) resolved for the current device — WITHOUT
  // this, Style/Layout panel edits produce no visible change in this preview.
  const styled = content as { style?: BlockStyle; layout?: BlockLayout };
  const wrap = resolveBlockPreviewWrapper(block.id, styled, device);
  return (
    <div data-block={block.type} className={wrap.className} style={wrap.style}>
      {wrap.layoutCss ? <style data-block-style="">{wrap.layoutCss}</style> : null}
      {def.Render({ content, ctx })}
    </div>
  );
}

"use client";

import { blockDef } from "@/blocks/registry";
import { UnsupportedBlock } from "@/blocks/UnsupportedBlock";
import { substituteRecordTokens } from "@/blocks/collection/bind";
import { resolveBlockPreviewWrapper } from "./blockPreviewStyle";
import type { BlockNode, Device } from "@/blocks/types";
import type { BlockStyle, BlockLayout } from "@/blocks/common";

/**
 * Read-only client render of a block tree for the stacked layout's live
 * preview — pure `def.Render`, no selection chrome or toolbars. Bound blocks
 * show a placeholder (their data resolves server-side on the published page),
 * mirroring the canvas.
 */
export function PreviewBlocks({
  blocks,
  device,
  record,
}: {
  blocks: BlockNode[];
  device: Device;
  record?: Record<string, unknown>;
}) {
  return (
    <>
      {blocks.map((b) => (
        <PreviewBlock key={b.id} block={b} device={device} record={record} />
      ))}
    </>
  );
}

function PreviewBlock({
  block,
  device,
  record,
}: {
  block: BlockNode;
  device: Device;
  record?: Record<string, unknown>;
}) {
  const def = blockDef(block.type);
  if (!def) return <UnsupportedBlock type={block.type} />;
  const parsed = def.schema.safeParse(block.content);
  if (!parsed.success) return null;
  const ctx = {
    mode: "editor" as const,
    device,
    viewer: null,
    // A caller-supplied `record` (the collection block, per item) overrides the
    // ambient one for that subtree; otherwise the ambient record threads through.
    children: (kids: BlockNode[], opts?: { horizontal?: boolean; record?: Record<string, unknown> }) => (
      <PreviewBlocks blocks={kids} device={device} record={opts?.record ?? record} />
    ),
  };
  // Bound blocks draw their real design from the pre-resolved data too; the
  // schema strips `_resolved` on parse, so re-attach it from the raw content.
  // Record tokens are substituted on the validated data BEFORE re-attaching
  // `_resolved` (same order as the public walker).
  const raw = block.content as Record<string, unknown>;
  const base = record ? substituteRecordTokens(parsed.data, record) : parsed.data;
  const content = (raw._resolved === undefined
    ? base
    : { ...(base as Record<string, unknown>), _resolved: raw._resolved }) as Record<string, unknown> & {
      style?: BlockStyle;
      layout?: BlockLayout;
    };
  // Single-device style/layout wrapper — the preview twin of BlockRenderer's
  // per-block CSS. Plain blocks (no style/layout) get undefined and keep today's
  // bare <div> wrapper (no class, no style).
  const wrap = resolveBlockPreviewWrapper(block.id, content, device);
  return (
    <div className={wrap.className} style={wrap.style}>
      {wrap.layoutCss ? <style data-block-style="">{wrap.layoutCss}</style> : null}
      {def.Render({ content, ctx })}
    </div>
  );
}

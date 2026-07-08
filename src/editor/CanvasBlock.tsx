"use client";

import type { MouseEvent, PointerEvent } from "react";
import { GripVertical, ChevronUp, ChevronDown, SquareStack, Copy, Trash2 } from "lucide-react";
import { blockDef } from "@/blocks/registry";
import { UnsupportedBlock } from "@/blocks/UnsupportedBlock";
import { isContainer, kidsOf } from "@/blocks/tree";
import { substituteRecordTokens } from "@/blocks/collection/bind";
import type { BlockNode, Device } from "@/blocks/types";
import type { BlockStyle, BlockLayout } from "@/blocks/common";
import { useEditor } from "./store";
import { BetweenMenuButton } from "./BetweenInsert";
import { resolveBlockPreviewWrapper } from "./blockPreviewStyle";
import styles from "./canvas.module.css";

/**
 * Re-attach the server-resolved data a block schema strips on parse. Bound
 * blocks read `content._resolved` in their Render; `def.schema.safeParse`
 * (Zod strip) drops unknown keys, so carry it across from the raw content.
 */
function withResolved(parsed: unknown, raw: Record<string, unknown>) {
  if (raw._resolved === undefined) return parsed;
  return { ...(parsed as Record<string, unknown>), _resolved: raw._resolved };
}

/** Drag/drop context PageEditor threads down so every nested block shares it. */
export type DragCtx = {
  device: Device;
  dragId: string | null;
  hoverId: string | null;
  drop: { parentId: string | null; index: number } | null;
  /** Register a block's DOM node for drag hit-testing (null on unmount). */
  registerEl: (id: string, node: HTMLElement | null) => void;
  setHover: (id: string | null) => void;
  startDrag: (id: string) => (e: PointerEvent) => void;
  dragCandidate: (id: string) => (e: PointerEvent) => void;
  onInsert: (parentId: string | null, index: number, type: string, patch?: Record<string, unknown>) => void;
};

/** Selectable, draggable canvas block — renders the real block inline + chrome. */
export function CanvasBlock({
  block,
  index,
  total,
  ctx,
  record,
}: {
  block: BlockNode;
  index: number;
  total: number;
  ctx: DragCtx;
  record?: Record<string, unknown>;
}) {
  const def = blockDef(block.type);
  const selection = useEditor((s) => s.selection);
  const select = useEditor((s) => s.select);
  const move = useEditor((s) => s.move);
  const remove = useEditor((s) => s.remove);
  const duplicate = useEditor((s) => s.duplicate);
  const wrap = useEditor((s) => s.wrapInSection);
  const patch = useEditor((s) => s.patch);
  if (!def) return <UnsupportedBlock type={block.type} />;

  const selected = selection.has(block.id);
  const hovered = ctx.hoverId === block.id;
  const locked = !!def.bound;
  const parsed = def.schema.safeParse(block.content);
  const dragging = ctx.dragId === block.id;

  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    select(block.id, e.metaKey || e.ctrlKey ? "toggle" : e.shiftKey ? "range" : "single");
  };

  // Record-field binding: when this block is inside a collection item template, a
  // `record` is in scope — replace `{{record.field}}` tokens in the VALIDATED
  // content (after safeParse), mirroring BlockRenderer. `_resolved` is re-attached
  // AFTER substitution (same order as the public walker, which resolves post-sub).
  const content = parsed.success
    ? (withResolved(
      record ? substituteRecordTokens(parsed.data, record) : parsed.data,
      block.content,
    ) as Record<string, unknown> & { style?: BlockStyle; layout?: BlockLayout })
    : null;
  // Single-device style/layout wrapper — the canvas twin of BlockRenderer's
  // per-block CSS. Plain blocks (no style/layout) get undefined/"" and keep today's
  // exact wrapper (no class, no style).
  const styleWrap = content
    ? resolveBlockPreviewWrapper(block.id, content, ctx.device)
    : { className: undefined, style: undefined, layoutCss: "" };

  const renderCtx = {
    mode: "editor" as const,
    device: ctx.device,
    viewer: null,
    children: (kids: BlockNode[], opts?: { horizontal?: boolean; record?: Record<string, unknown> }) => (
      // A caller-supplied `record` (the collection block, per item) overrides the
      // ambient one for that subtree; otherwise the ambient record threads through.
      <CanvasChildren blocks={kids} parentId={block.id} ctx={ctx} record={opts?.record ?? record} />
    ),
    onChange: (partial: Record<string, unknown>) => patch(block.id, { ...block.content, ...partial }),
  };

  return (
    <div
      ref={(node) => ctx.registerEl(block.id, node)}
      data-block={block.type}
      data-selected={selected || undefined}
      className={[styles.canvasBlock, styleWrap.className].filter(Boolean).join(" ")}
      style={{
        ...styleWrap.style,
        opacity: dragging ? 0.5 : styleWrap.style?.opacity ?? 1,
        cursor: dragging ? "grabbing" : "pointer",
      }}
      onClick={onClick}
      onMouseOver={(e) => {
        e.stopPropagation();
        ctx.setHover(block.id);
      }}
      onPointerDown={ctx.dragCandidate(block.id)}
    >
      {styleWrap.layoutCss ? <style data-block-style="">{styleWrap.layoutCss}</style> : null}
      {selected ? <span className={styles.blockTag}>{def.label}</span> : null}
      {selected || hovered ? (
        <span
          className={styles.blockTools}
          data-pb-toolbar="1"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {!locked ? (
            <button type="button" className={styles.toolBtn} title="Drag" style={{ cursor: "grab", touchAction: "none" }} onPointerDown={ctx.startDrag(block.id)}><GripVertical size={14} /></button>
          ) : null}
          <button type="button" className={styles.toolBtn} disabled={locked || index === 0} onClick={() => move(block.id, -1)} title="Move up"><ChevronUp size={14} /></button>
          <button type="button" className={styles.toolBtn} disabled={locked || index === total - 1} onClick={() => move(block.id, 1)} title="Move down"><ChevronDown size={14} /></button>
          <button type="button" className={styles.toolBtn} disabled={locked} onClick={() => wrap(block.id)} title="Wrap in section"><SquareStack size={14} /></button>
          <button type="button" className={styles.toolBtn} disabled={locked} onClick={() => duplicate(block.id)} title="Duplicate"><Copy size={14} /></button>
          <button type="button" className={`${styles.toolBtn} ${styles.toolBtnDanger}`} disabled={locked} onClick={() => remove(block.id)} title="Remove"><Trash2 size={14} /></button>
        </span>
      ) : null}

      {!parsed.success ? (
        <div className={styles.invalid}>Invalid {def.label} content</div>
      ) : (
        // Bound (dynamic) blocks render their real design too — the page-edit
        // route pre-resolves their CMS data into `content._resolved`, and each
        // block's Render draws it (falling back to its own "· Live …"
        // placeholder only when a freshly-added block hasn't been resolved yet).
        // The block schema strips `_resolved` on parse, so re-attach it here.
        def.Render({ content, ctx: renderCtx })
      )}
    </div>
  );
}

/** Thin drop-line at the live drop index. */
function DropLine({ horizontal }: { horizontal?: boolean }) {
  return (
    <div
      style={{
        height: 3,
        gridColumn: horizontal ? "1 / -1" : undefined,
        background: "var(--accent)",
        borderRadius: 2,
        margin: "2px 0",
        boxShadow: "0 0 0 3px var(--maroon-tint, var(--accent-tint))",
      }}
    />
  );
}

/**
 * Recursive child renderer — each child is a first-class CanvasBlock with its
 * own toolbar + between-block InsertMenu; drop-lines mark the active drag
 * target. Mutually recursive with CanvasBlock so any nesting depth edits alike.
 */
export function CanvasChildren({
  blocks,
  parentId,
  ctx,
  record,
}: {
  blocks: BlockNode[];
  parentId: string | null;
  ctx: DragCtx;
  record?: Record<string, unknown>;
}) {
  const targeted = !!(ctx.drop && ctx.dragId && ctx.drop.parentId === parentId);

  if (!blocks.length) {
    return (
      <div className={styles.emptyDrop} style={targeted ? { borderColor: "var(--accent)", background: "var(--maroon-tint, var(--accent-tint))" } : undefined}>
        Drop a block here, or use ＋ to add one
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {blocks.map((b, i) => (
        <div key={b.id} style={{ position: "relative", minWidth: 0 }}>
          {ctx.drop && ctx.dragId && ctx.drop.parentId === parentId && ctx.drop.index === i ? <DropLine /> : null}
          <CanvasBlock block={b} index={i} total={blocks.length} ctx={ctx} record={record} />
          <InsertMenu onInsert={(type, patch) => ctx.onInsert(parentId, i + 1, type, patch)} />
        </div>
      ))}
      {ctx.drop && ctx.dragId && ctx.drop.parentId === parentId && ctx.drop.index >= blocks.length ? <DropLine /> : null}
    </div>
  );
}

/** Between-block quick insert — a centered ＋ that opens the block menu. */
function InsertMenu({ onInsert }: { onInsert: (type: string, patch?: Record<string, unknown>) => void }) {
  return (
    <div className={styles.insertRow}>
      <BetweenMenuButton onInsert={onInsert} />
    </div>
  );
}

/** True when a node or any descendant is in the selection (used by bulk UI). */
export function subtreeSelected(block: BlockNode, selection: Set<string>): boolean {
  if (selection.has(block.id)) return true;
  if (!isContainer(block)) return false;
  return kidsOf(block).some((k) => subtreeSelected(k, selection));
}

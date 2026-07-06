"use client";

import type { MouseEvent, PointerEvent } from "react";
import { blockDef } from "@/blocks/registry";
import { UnsupportedBlock } from "@/blocks/UnsupportedBlock";
import { isContainer, kidsOf } from "@/blocks/tree";
import type { BlockNode, Device } from "@/blocks/types";
import type { BlockStyle, BlockLayout } from "@/blocks/common";
import { useEditor } from "./store";
import { BetweenMenuButton } from "./BetweenInsert";
import type { OnAddBlock } from "./BlockPicker";
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

/** Apply the display-only preview transform (template editor) if one is set. */
function applyPreview(
  content: unknown,
  type: string,
  transform?: (c: Record<string, unknown>, type: string) => Record<string, unknown>,
): unknown {
  if (!transform || content === null || typeof content !== "object") return content;
  return transform(content as Record<string, unknown>, type);
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
  onInsert: (
    parentId: string | null,
    index: number,
    type: string,
    patch?: Record<string, unknown>,
  ) => void;
  /**
   * DISPLAY-ONLY content transform, applied to each block's parsed content just
   * before its Render — never to the stored/saved tree. The content-type
   * template editor sets this to fill `{{field}}` tokens (and resolve `field`
   * blocks) from a sample row so the canvas previews real data (e.g. "Blue
   * Widget"), while the store (and thus the Inspector + what saves) keeps the
   * raw tokens/field keys. `type` is the block's type so the transform can
   * treat a `field` block differently. Undefined for every other editor → no
   * change.
   */
  previewContent?: (content: Record<string, unknown>, type: string) => Record<string, unknown>;
};

/** Selectable, draggable canvas block — renders the real block inline + chrome. */
export function CanvasBlock({
  block,
  index,
  total,
  ctx,
}: {
  block: BlockNode;
  index: number;
  total: number;
  ctx: DragCtx;
}) {
  const def = blockDef(block.type);
  const selection = useEditor((s) => s.selection);
  const select = useEditor((s) => s.select);
  const move = useEditor((s) => s.move);
  const remove = useEditor((s) => s.remove);
  const duplicate = useEditor((s) => s.duplicate);
  const wrap = useEditor((s) => s.wrapInSection);
  const selected = selection.has(block.id);

  if (!def) {
    // Still registers with the drag/select system and offers at least a
    // Remove button — an earlier version returned this bare, which meant an
    // unsupported block (an imported pack the install doesn't have, or a
    // disabled plugin) had no way to be removed from the canvas and never
    // participated in drag hit-testing, unlike BlockCard.tsx's equivalent
    // handling in the stacked layout.
    return (
      <div
        ref={(node) => ctx.registerEl(block.id, node)}
        data-selected={selected || undefined}
        className={styles.canvasBlock}
        onClick={(e: MouseEvent) => {
          e.stopPropagation();
          select(block.id, e.metaKey || e.ctrlKey ? "toggle" : e.shiftKey ? "range" : "single");
        }}
        onMouseOver={(e) => {
          e.stopPropagation();
          ctx.setHover(block.id);
        }}
      >
        {selected ? <span className={styles.blockTag}>Unsupported ({block.type})</span> : null}
        {selected || ctx.hoverId === block.id ? (
          <span
            className={styles.blockTools}
            data-pb-toolbar="1"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button type="button" className={styles.toolBtn} disabled={index === 0} onClick={() => move(block.id, -1)} title="Move up">↑</button>
            <button type="button" className={styles.toolBtn} disabled={index === total - 1} onClick={() => move(block.id, 1)} title="Move down">↓</button>
            <button type="button" className={styles.toolBtn} onClick={() => remove(block.id)} title="Remove">🗑</button>
          </span>
        ) : null}
        <UnsupportedBlock type={block.type} />
      </div>
    );
  }
  const hovered = ctx.hoverId === block.id;
  const locked = !!def.bound;
  const parsed = def.schema.safeParse(block.content);
  const dragging = ctx.dragId === block.id;

  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    select(block.id, e.metaKey || e.ctrlKey ? "toggle" : e.shiftKey ? "range" : "single");
  };

  const renderCtx = {
    mode: "editor" as const,
    device: ctx.device,
    viewer: null,
    children: (kids: BlockNode[]) => <CanvasChildren blocks={kids} parentId={block.id} ctx={ctx} />,
  };

  return (
    <div
      ref={(node) => ctx.registerEl(block.id, node)}
      data-selected={selected || undefined}
      className={styles.canvasBlock}
      style={{ opacity: dragging ? 0.5 : 1, cursor: dragging ? "grabbing" : "pointer" }}
      onClick={onClick}
      onMouseOver={(e) => {
        e.stopPropagation();
        ctx.setHover(block.id);
      }}
      onPointerDown={ctx.dragCandidate(block.id)}
    >
      {selected ? <span className={styles.blockTag}>{def.label}</span> : null}
      {selected || hovered ? (
        <span
          className={styles.blockTools}
          data-pb-toolbar="1"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {!locked ? (
            <button type="button" className={styles.toolBtn} title="Drag" style={{ cursor: "grab", touchAction: "none" }} onPointerDown={ctx.startDrag(block.id)}>⠿</button>
          ) : null}
          <button type="button" className={styles.toolBtn} disabled={locked || index === 0} onClick={() => move(block.id, -1)} title="Move up">↑</button>
          <button type="button" className={styles.toolBtn} disabled={locked || index === total - 1} onClick={() => move(block.id, 1)} title="Move down">↓</button>
          <button type="button" className={styles.toolBtn} disabled={locked} onClick={() => wrap(block.id)} title="Wrap in section">▣</button>
          <button type="button" className={styles.toolBtn} disabled={locked} onClick={() => duplicate(block.id)} title="Duplicate">⧉</button>
          <button type="button" className={styles.toolBtn} disabled={locked} onClick={() => remove(block.id)} title="Remove">🗑</button>
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
        // `previewContent` (template editor only) then fills {{field}} tokens
        // from a sample row for DISPLAY — the stored/edited tree is untouched.
        //
        // The style/layout wrapper below mirrors BlockRenderer's data-block
        // wrapper (padding/colour/border inline, flex/grid via a scoped
        // <style>) resolved for ctx.device — WITHOUT this, Style/Layout panel
        // edits produce no visible change on the canvas. Nested INSIDE the
        // editor's own selection/drag chrome div (styles.canvasBlock) rather
        // than merged onto it, so an author's background/opacity never
        // collides with the editor's own selection-highlight styling.
        (() => {
          const content = applyPreview(withResolved(parsed.data, block.content), block.type, ctx.previewContent) as {
            style?: BlockStyle;
            layout?: BlockLayout;
          };
          const wrap = resolveBlockPreviewWrapper(block.id, content, ctx.device);
          return (
            <div data-block={block.type} className={wrap.className} style={wrap.style}>
              {wrap.layoutCss ? <style data-block-style="">{wrap.layoutCss}</style> : null}
              {def.Render({ content, ctx: renderCtx })}
            </div>
          );
        })()
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
}: {
  blocks: BlockNode[];
  parentId: string | null;
  ctx: DragCtx;
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
          <CanvasBlock block={b} index={i} total={blocks.length} ctx={ctx} />
          <InsertMenu onInsert={(type, patch) => ctx.onInsert(parentId, i + 1, type, patch)} />
        </div>
      ))}
      {ctx.drop && ctx.dragId && ctx.drop.parentId === parentId && ctx.drop.index >= blocks.length ? <DropLine /> : null}
    </div>
  );
}

/** Between-block quick insert — a centered ＋ that opens the block menu. */
function InsertMenu({ onInsert }: { onInsert: OnAddBlock }) {
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

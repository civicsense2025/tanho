"use client";

import { useContext, useState } from "react";
import type { CSSProperties } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Plus,
  SquareStack,
  Trash2,
} from "lucide-react";
import { blockDef, categories } from "@/blocks/registry";
import { canNest, isContainer, kidsOf } from "@/blocks/tree";
import type { BlockNode } from "@/blocks/types";
import { subtreeSelected } from "./CanvasBlock";
import { useEditor } from "./store";
import { type DndApi, type DropHover, type RowInfo, DndContext, computeDrop } from "./layers-dnd";
import styles from "./layers-panel.module.css";

const catLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id;

export type LayersPanelProps = {
  open: boolean;
  onToggle: (open: boolean) => void;
  onAddBlock?: () => void;
  className?: string;
  style?: CSSProperties;
};

// ─── recursive tree ──────────────────────────────────────────────────────────

function LayerRow({
  block,
  parentId,
  parentType,
  depth,
  index,
  total,
}: {
  block: BlockNode;
  parentId: string | null;
  parentType: string | null;
  depth: number;
  index: number;
  total: number;
}) {
  const dnd = useContext(DndContext)!;
  const selection = useEditor((s) => s.selection);
  const select = useEditor((s) => s.select);
  const move = useEditor((s) => s.move);
  const duplicate = useEditor((s) => s.duplicate);
  const remove = useEditor((s) => s.remove);
  const wrap = useEditor((s) => s.wrapInSection);
  const [collapsed, setCollapsed] = useState(false);

  const def = blockDef(block.type);
  if (!def) return null;
  const isCont = isContainer(block);
  const hasKids = isCont && kidsOf(block).length > 0;
  const selected = selection.has(block.id) || subtreeSelected(block, selection);
  const dragging = dnd.draggingId === block.id;
  const dropPos = dnd.drop?.rowId === block.id ? dnd.drop.pos : null;
  const canWrap =
    block.type !== "section" && canNest("section", block.type) && canNest(parentType, "section");
  const rowInfo: RowInfo = { id: block.id, parentId, isContainer: isCont };

  return (
    <div className={styles.children}>
      <div
        className={styles.row}
        draggable
        data-selected={selected || undefined}
        data-dragging={dragging ? "true" : undefined}
        data-drop={dropPos ?? undefined}
        style={{ paddingLeft: `calc(${depth} * var(--space-3))` }}
        onClick={() => select(block.id, "single")}
        onDragStart={(e) => {
          // don't start a row drag from the chevron or action buttons
          if ((e.target as HTMLElement).closest("[data-no-drag]")) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.effectAllowed = "move";
          dnd.beginDrag(block.id);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          dnd.overRow(rowInfo, e.clientY, rect, e.dataTransfer);
        }}
        onDrop={(e) => {
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          dnd.dropOnRow(rowInfo, e.clientY, rect);
        }}
        onDragEnd={dnd.endDrag}
      >
        {hasKids ? (
          <button
            type="button"
            data-no-drag
            className={styles.chevron}
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed((c) => !c);
            }}
            title={collapsed ? "Expand" : "Collapse"}
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
        ) : (
          <span className={styles.spacer} aria-hidden />
        )}
        {def.bound ? <span className={styles.boundMark} aria-hidden>◆</span> : null}
        <span className={styles.label} title={def.label}>
          {def.label}
        </span>
        <span className={styles.cat}>{catLabel(def.category)}</span>
        <span
          className={styles.actions}
          data-no-drag
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className={styles.act}
            disabled={index === 0}
            onClick={() => move(block.id, -1)}
            title="Move up"
            aria-label="Move up"
          >
            <ChevronUp size={12} />
          </button>
          <button
            type="button"
            className={styles.act}
            disabled={index === total - 1}
            onClick={() => move(block.id, 1)}
            title="Move down"
            aria-label="Move down"
          >
            <ChevronDown size={12} />
          </button>
          <button
            type="button"
            className={styles.act}
            disabled={!canWrap}
            onClick={() => canWrap && wrap(block.id)}
            title="Wrap in section"
            aria-label="Wrap in section"
          >
            <SquareStack size={12} />
          </button>
          <button
            type="button"
            className={styles.act}
            onClick={() => duplicate(block.id)}
            title="Duplicate"
            aria-label="Duplicate"
          >
            <Copy size={12} />
          </button>
          <button
            type="button"
            className={`${styles.act} ${styles.actDanger}`}
            onClick={() => remove(block.id)}
            title="Delete"
            aria-label="Delete"
          >
            <Trash2 size={12} />
          </button>
        </span>
      </div>
      {hasKids && !collapsed
        ? kidsOf(block).map((child, i) => (
          <LayerRow
            key={child.id}
            block={child}
            parentId={block.id}
            parentType={block.type}
            depth={depth + 1}
            index={i}
            total={kidsOf(block).length}
          />
        ))
        : null}
    </div>
  );
}

// ─── panel ───────────────────────────────────────────────────────────────────

export function LayersPanel({ open, onToggle, onAddBlock, className, style }: LayersPanelProps) {
  const blocks = useEditor((s) => s.blocks);
  const dropMove = useEditor((s) => s.dropMove);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [drop, setDrop] = useState<DropHover>(null);

  const api: DndApi = {
    draggingId,
    drop,
    beginDrag: (id) => setDraggingId(id),
    overRow: (row, clientY, rect, dt) => {
      const cand = computeDrop(blocks, draggingId, row, clientY, rect);
      if (cand) {
        dt.dropEffect = "move";
        setDrop({ rowId: row.id, pos: cand.pos });
      } else {
        dt.dropEffect = "none";
        setDrop(null);
      }
    },
    dropOnRow: (row, clientY, rect) => {
      const cand = computeDrop(blocks, draggingId, row, clientY, rect);
      if (cand && draggingId) dropMove(draggingId, cand.parentId, cand.index);
    },
    endDrag: () => {
      setDraggingId(null);
      setDrop(null);
    },
  };

  return (
    <DndContext.Provider value={api}>
      <aside className={[styles.panel, className].filter(Boolean).join(" ")} data-open={open} style={style}>
        <div className={styles.header}>
          <button
            type="button"
            className={styles.toggle}
            onClick={() => onToggle(!open)}
            title={open ? "Collapse" : "Expand"}
            aria-label={open ? "Collapse" : "Expand"}
            aria-expanded={open}
          >
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <h2 className={styles.title}>Layers</h2>
          <span className={styles.headerSpacer} />
        </div>

        <div className={styles.body}>
          {blocks.length === 0 ? (
            <p className={styles.empty}>No blocks yet — add one on the canvas.</p>
          ) : (
            blocks.map((b, i) => (
              <LayerRow
                key={b.id}
                block={b}
                parentId={null}
                parentType={null}
                depth={0}
                index={i}
                total={blocks.length}
              />
            ))
          )}
        </div>

        {onAddBlock ? (
          <div className={styles.footer}>
            <button type="button" className={styles.addBtn} onClick={onAddBlock}>
              <Plus size={12} /> Add block
            </button>
          </div>
        ) : null}
      </aside>
    </DndContext.Provider>
  );
}

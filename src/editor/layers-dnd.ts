import { createContext } from "react";
import { canNest, kidsOf, treeContains, treeFind } from "@/blocks/tree";
import type { BlockNode } from "@/blocks/types";

// ─── drag-and-drop ───────────────────────────────────────────────────────────
// Self-contained HTML5 DnD for a flat tree list. State lives in LayersPanel and
// is shared down the recursion via context so each row can read the live drag id
// + drop indicator without prop-drilling. On drop we recompute the target from
// the event (not from state) to avoid any stale-state race, then commit one real
// `dropMove` — the same store action the canvas DnD uses.

export type RowInfo = { id: string; parentId: string | null; isContainer: boolean };
export type DropHover = { rowId: string; pos: "above" | "below" } | null;
export type DndApi = {
  draggingId: string | null;
  drop: DropHover;
  beginDrag: (id: string) => void;
  overRow: (row: RowInfo, clientY: number, rect: DOMRect, dt: DataTransfer) => void;
  dropOnRow: (row: RowInfo, clientY: number, rect: DOMRect) => void;
  endDrag: () => void;
};

export const DndContext = createContext<DndApi | null>(null);

/** Decide the commit target {parentId, index} + indicator position for a drop
 *  over a given row. Guards: not onto self, not into the dragged block's own
 *  subtree, and the nesting rule (`canNest`). Indexes are computed against the
 *  sibling list with the dragged block removed — matching `useCanvasDrag` so the
 *  store's remove-then-insert `dropMove` lands exactly where the indicator shows. */
export function computeDrop(
  blocks: BlockNode[],
  draggedId: string | null,
  row: RowInfo,
  clientY: number,
  rect: DOMRect,
): { parentId: string | null; index: number; pos: "above" | "below" } | null {
  if (!draggedId) return null;
  const dragged = treeFind(blocks, draggedId);
  if (!dragged || row.id === draggedId) return null;
  const draggedType = dragged.type;
  const upper = clientY < rect.top + rect.height / 2;

  let parentId: string | null;
  let index: number;
  let pos: "above" | "below";
  if (row.isContainer && !upper) {
    // lower half of a container → insert as its first child
    parentId = row.id;
    index = 0;
    pos = "below";
  } else {
    parentId = row.parentId;
    const parent = row.parentId == null ? null : treeFind(blocks, row.parentId);
    const sibs = (parent ? kidsOf(parent) : blocks).filter((b) => b.id !== draggedId);
    const i = sibs.findIndex((b) => b.id === row.id);
    if (upper) {
      index = i < 0 ? 0 : i;
      pos = "above";
    } else {
      index = i < 0 ? sibs.length : i + 1;
      pos = "below";
    }
  }

  if (parentId === draggedId) return null;
  if (parentId && treeContains(blocks, draggedId, parentId)) return null;
  const parentType = parentId ? treeFind(blocks, parentId)?.type ?? null : null;
  if (!canNest(parentType, draggedType)) return null;
  return { parentId, index, pos };
}

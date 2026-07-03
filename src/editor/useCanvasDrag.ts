"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { canNest, isContainer, kidsOf, treeContains, treeFind } from "@/blocks/tree";
import type { BlockNode } from "@/blocks/types";

type Drop = { parentId: string | null; index: number } | null;

const ROOT = "__root";

/**
 * Canvas drag-and-drop across the whole nested tree — port of the design's
 * pointer-based DnD. On each move it hit-tests every container element (root +
 * layout blocks), picks the DEEPEST legal one under the pointer, then finds the
 * insertion index by comparing the pointer to each child's midpoint. Dropping
 * commits one real tree move via `dropMove`, so a block can go root→section,
 * section→row, or reorder in place through a single path.
 *
 * The hook owns the DOM-node map: blocks call `registerEl(id, node)`, the root
 * container calls `registerRoot(node)`.
 */
export function useCanvasDrag({
  blocks,
  dropMove,
  enabled,
}: {
  blocks: BlockNode[];
  dropMove: (id: string, parentId: string | null, index: number) => void;
  enabled: boolean;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<Drop>(null);
  const dragInfo = useRef<Drop>(null);
  const els = useRef<Record<string, HTMLElement | null>>({});
  const blocksRef = useRef(blocks);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const registerEl = useCallback((id: string, node: HTMLElement | null) => {
    els.current[id] = node;
  }, []);
  const registerRoot = useCallback((node: HTMLElement | null) => {
    els.current[ROOT] = node;
  }, []);

  const computeDrop = useCallback((x: number, y: number, id: string): Drop => {
    const bs = blocksRef.current;
    const dragged = treeFind(bs, id);
    const draggedType = dragged?.type ?? null;
    if (!draggedType) return null;

    type Cand = { parentId: string | null; parentType: string | null; rect: DOMRect };
    const cands: Cand[] = [];
    const rootEl = els.current[ROOT];
    if (rootEl) cands.push({ parentId: null, parentType: null, rect: rootEl.getBoundingClientRect() });
    if (enabledRef.current) {
      const walk = (list: BlockNode[]) =>
        list.forEach((b) => {
          if (isContainer(b)) {
            const el = els.current[b.id];
            if (el) cands.push({ parentId: b.id, parentType: b.type, rect: el.getBoundingClientRect() });
            walk(kidsOf(b));
          }
        });
      walk(bs);
    }

    let best: Cand | null = null;
    let bestArea = Infinity;
    for (const cd of cands) {
      const r = cd.rect;
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
      if (cd.parentId === id) continue; // not into itself
      if (cd.parentId && treeContains(bs, id, cd.parentId)) continue; // not into own subtree
      if (!canNest(cd.parentType, draggedType)) continue;
      const area = (r.right - r.left) * (r.bottom - r.top);
      if (area < bestArea) {
        bestArea = area;
        best = cd;
      }
    }
    if (!best) {
      if (!rootEl) return null;
      best = { parentId: null, parentType: null, rect: rootEl.getBoundingClientRect() };
    }

    const parentBlock = best.parentId == null ? null : treeFind(bs, best.parentId);
    const kids = (best.parentId == null ? bs : parentBlock ? kidsOf(parentBlock) : []).filter((b) => b.id !== id);
    const horizontal = best.parentType === "row" || best.parentType === "columns";
    let index = kids.length;
    for (let i = 0; i < kids.length; i++) {
      const el = els.current[kids[i].id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const mid = horizontal ? r.left + r.width / 2 : r.top + r.height / 2;
      if ((horizontal ? x : y) < mid) {
        index = i;
        break;
      }
    }
    return { parentId: best.parentId, index };
  }, []);

  const beginDrag = useCallback(
    (id: string) => {
      setDragId(id);
      dragInfo.current = null;
      try {
        window.getSelection()?.removeAllRanges();
      } catch {
        /* noop */
      }
      const onMove = (ev: PointerEvent) => {
        const d = computeDrop(ev.clientX, ev.clientY, id);
        dragInfo.current = d;
        setDrop(d);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        const d = dragInfo.current;
        if (d) dropMove(id, d.parentId, d.index);
        dragInfo.current = null;
        setDragId(null);
        setDrop(null);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [computeDrop, dropMove],
  );

  /** Grip handle: drag starts immediately. */
  const startDrag = useCallback(
    (id: string) => (e: ReactPointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      beginDrag(id);
    },
    [beginDrag],
  );

  /** Block body: drag starts only after a small movement threshold, so plain
   *  clicks still select and inline controls stay interactive. */
  const dragCandidate = useCallback(
    (id: string) => (e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('[contenteditable="true"],[data-pb-editable],input,textarea,select,button,a,[data-pb-toolbar]')) return;
      const sx = e.clientX;
      const sy = e.clientY;
      const move = (ev: PointerEvent) => {
        if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 7) {
          cleanup();
          beginDrag(id);
        }
      };
      const cleanup = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", cleanup);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", cleanup);
    },
    [beginDrag],
  );

  return { dragId, drop, startDrag, dragCandidate, registerEl, registerRoot };
}

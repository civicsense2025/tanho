import { createId } from "@paralleldrive/cuid2";
import type { BlockNode } from "./types";

/**
 * Nested block-tree operations — direct port of the design's editor tree
 * model. Layout blocks (section/container/row/columns) hold children in
 * content.blocks; every operation walks the whole tree so nested blocks
 * are first-class. Pure functions: shared by editor UI and server actions.
 */

export const CONTAINER_TYPES = ["section", "container", "row", "columns"] as const;

export const isContainer = (b: BlockNode | null | undefined): boolean =>
  !!b && (CONTAINER_TYPES as readonly string[]).includes(b.type) &&
  Array.isArray((b.content as { blocks?: unknown }).blocks);

export const kidsOf = (b: BlockNode): BlockNode[] =>
  (b.content as { blocks?: BlockNode[] }).blocks ?? [];

/** Nesting rules: which child types a parent accepts (null = page root). */
export function canNest(parentType: string | null, childType: string): boolean {
  if (parentType == null) return true;
  if (parentType === "section") return childType !== "section";
  if (parentType === "container") return true;
  if (parentType === "row" || parentType === "columns") {
    return childType !== "section" && childType !== "row" && childType !== "columns";
  }
  return false;
}

export function treeFind(blocks: BlockNode[], id: string): BlockNode | null {
  for (const b of blocks) {
    if (b.id === id) return b;
    if (isContainer(b)) {
      const f = treeFind(kidsOf(b), id);
      if (f) return f;
    }
  }
  return null;
}

export type TreeLocation = { parentId: string | null; index: number; count: number };

export function treeLocate(
  blocks: BlockNode[],
  id: string,
  parentId: string | null = null,
): TreeLocation | null {
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.id === id) return { parentId, index: i, count: blocks.length };
    if (isContainer(b)) {
      const r = treeLocate(kidsOf(b), id, b.id);
      if (r) return r;
    }
  }
  return null;
}

export function treeRemove(
  blocks: BlockNode[],
  id: string,
): { blocks: BlockNode[]; removed: BlockNode | null } {
  let removed: BlockNode | null = null;
  const out: BlockNode[] = [];
  for (const b of blocks) {
    if (b.id === id) {
      removed = b;
      continue;
    }
    if (isContainer(b)) {
      const r = treeRemove(kidsOf(b), id);
      if (r.removed) {
        removed = r.removed;
        out.push({ ...b, content: { ...b.content, blocks: r.blocks } });
        continue;
      }
    }
    out.push(b);
  }
  return { blocks: out, removed };
}

export function treeInsert(
  blocks: BlockNode[],
  parentId: string | null,
  index: number,
  block: BlockNode,
): BlockNode[] {
  if (parentId == null) {
    const c = blocks.slice();
    c.splice(Math.max(0, Math.min(index, c.length)), 0, block);
    return c;
  }
  return blocks.map((b) => {
    if (b.id === parentId) {
      const kids = kidsOf(b).slice();
      kids.splice(Math.max(0, Math.min(index, kids.length)), 0, block);
      return { ...b, content: { ...b.content, blocks: kids } };
    }
    if (isContainer(b)) {
      return {
        ...b,
        content: { ...b.content, blocks: treeInsert(kidsOf(b), parentId, index, block) },
      };
    }
    return b;
  });
}

export function treeSetContent(
  blocks: BlockNode[],
  id: string,
  content: Record<string, unknown>,
): BlockNode[] {
  return blocks.map((b) => {
    if (b.id === id) return { ...b, content };
    if (isContainer(b)) {
      return {
        ...b,
        content: { ...b.content, blocks: treeSetContent(kidsOf(b), id, content) },
      };
    }
    return b;
  });
}

/** Swap a block with its previous/next sibling inside its parent. */
export function treeMove(blocks: BlockNode[], id: string, dir: -1 | 1): BlockNode[] {
  const idx = blocks.findIndex((b) => b.id === id);
  if (idx !== -1) {
    const j = idx + dir;
    if (j < 0 || j >= blocks.length) return blocks;
    const c = blocks.slice();
    [c[idx], c[j]] = [c[j], c[idx]];
    return c;
  }
  return blocks.map((b) =>
    isContainer(b)
      ? { ...b, content: { ...b.content, blocks: treeMove(kidsOf(b), id, dir) } }
      : b,
  );
}

/** Is maybeDescId inside ancestorId's subtree? */
export function treeContains(
  blocks: BlockNode[],
  ancestorId: string,
  maybeDescId: string,
): boolean {
  const a = treeFind(blocks, ancestorId);
  return !!(a && isContainer(a) && treeFind(kidsOf(a), maybeDescId));
}

/** Deep clone with fresh ids (duplicate). */
export function cloneWithIds(block: BlockNode): BlockNode {
  const c = JSON.parse(JSON.stringify(block.content ?? {})) as Record<string, unknown>;
  if (Array.isArray(c.blocks)) {
    c.blocks = (c.blocks as BlockNode[]).map((k) => cloneWithIds(k));
  }
  return { id: newBlockId(), type: block.type, content: c };
}

export const newBlockId = () => `b_${createId()}`;

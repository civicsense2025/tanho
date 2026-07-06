import { createId } from "@paralleldrive/cuid2";
import type { BlockNode } from "./types";

/**
 * Nested block-tree operations — direct port of the design's editor tree
 * model. Layout blocks (section/container/row/columns) hold children in
 * content.blocks; every operation walks the whole tree so nested blocks
 * are first-class. Pure functions: shared by editor UI and server actions.
 */

export const CONTAINER_TYPES = [
  "section",
  "container",
  "row",
  "columns",
  // The collection block's `content.blocks` is its per-record item template — a
  // real child tree, so the tree walker/editor treat it as a container.
  "collection",
  // phase3-chrome-blocks: header/footer are nestable chrome containers.
  "site-header",
  "site-footer",
] as const;

// phase3-chrome-blocks: the sub-blocks a site-header / site-footer may hold.
// Kept as one set so the nesting rule below (and any future picker scoping)
// reads from a single source. Contiguous for an easy merge.
const CHROME_CONTAINERS = ["site-header", "site-footer"] as const;
const CHROME_CHILD_TYPES = [
  "logo",
  "nav-menu",
  "cta-button",
  "footer-column",
  "social-links",
  "announcement",
] as const;
const isChromeContainer = (t: string | null): boolean =>
  t != null && (CHROME_CONTAINERS as readonly string[]).includes(t);
const isChromeChild = (t: string): boolean =>
  (CHROME_CHILD_TYPES as readonly string[]).includes(t);

export const isContainer = (b: BlockNode | null | undefined): boolean =>
  !!b && (CONTAINER_TYPES as readonly string[]).includes(b.type) &&
  Array.isArray((b.content as { blocks?: unknown }).blocks);

export const kidsOf = (b: BlockNode): BlockNode[] =>
  (b.content as { blocks?: BlockNode[] }).blocks ?? [];

const LAYOUT_CONTAINERS = ["section", "container", "row", "columns"] as const;
const isLayoutContainer = (t: string | null): boolean =>
  t != null && (LAYOUT_CONTAINERS as readonly string[]).includes(t);

/** Nesting rules: which child types a parent accepts (null = tree root). */
export function canNest(parentType: string | null, childType: string): boolean {
  // ─── chrome nesting (site-header/site-footer are now full content areas) ────
  // A chrome container accepts ANY block that isn't itself a chrome container —
  // the chrome sub-blocks (logo/nav-menu/…) AND ordinary content/media/layout
  // blocks — so a header/footer can be composed as freely as a page.
  if (isChromeContainer(parentType)) return !isChromeContainer(childType);

  // Chrome SUB-blocks (logo/nav-menu/cta-button/footer-column/social-links) need
  // chrome/menu context, so they may only live inside a chrome container or a
  // LAYOUT container (which, in a chrome tree, groups them) — never at the page
  // root. `announcement` additionally sits at the chrome tree root (a top strip
  // beside site-header — how templates.ts + the seed compose it).
  //
  // NOTE: canNest only gates the DnD / wrap / group paths (useCanvasDrag, store
  // move ops). The picker's `insert` does NOT consult canNest, and the page
  // editor's picker is not category-scoped, so a chrome sub-block can still be
  // *added* to a page via the picker today (a pre-existing gap, not enforced
  // here). Harmless at render — a stray chrome block only draws its own schema-
  // validated content — but scope the page picker or gate insert() to close it.
  if (isChromeChild(childType)) {
    if (childType === "announcement" && parentType == null) return true;
    return isChromeContainer(parentType) || isLayoutContainer(parentType);
  }

  // Chrome containers only ever sit at a tree root (their chrome:* owner) —
  // never nested in a page layout block or in each other.
  if (isChromeContainer(childType)) return parentType == null;

  // A collection template can hold ordinary blocks but NOT another collection
  // (nesting repeaters multiplies render fan-out) nor a section (a band inside a
  // card is nonsensical). Guard both directions.
  if (childType === "collection" && parentType === "collection") return false;
  if (parentType === "collection") return childType !== "section";

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

"use client";

import { create } from "zustand";
import {
  cloneWithIds,
  treeFind,
  treeInsert,
  treeLocate,
  treeMove,
  treeRemove,
  treeSetContent,
  canNest,
  newBlockId,
} from "@/blocks/tree";
import type { BlockNode, Device } from "@/blocks/types";
import { createSymbol, inlineSymbol } from "@/modules/blocks/symbol-actions";
import type { SymbolOverride } from "@/blocks/symbol/fields";

/** One editable field of the content type being templated. */
export type ContentTypeField = { key: string; label: string; kind: string };

/** Content-type context surfaced to the editor when templating a content type. */
export type ContentTypeContext = {
  /** The type's slug (e.g. "products") — matches a block's `suggestedFor`. */
  slug: string;
  /** The type's fields — for field-pickers, per-field suggestions, token helper. */
  fields: ContentTypeField[];
};

type EditorState = {
  blocks: BlockNode[];
  selection: Set<string>;
  lastSelected: string | null;
  onChange: ((blocks: BlockNode[]) => void) | null;
  /** Key of the content last loaded via init(); lets a consumer render its own
   *  server data until the (post-paint effect) init has populated the store. */
  readyFor: string | null;
  /** The active preview device. Lifted from PageEditor into the store so the
   *  canvas AND the Inspector's style controls read one source — the device
   *  is both the previewed viewport and the breakpoint the Style section edits. */
  device: Device;
  /** The set of block types enabled in the DB registry (server-fetched). The
   *  pickers filter to this; null = show all compiled defs (backward compat for
   *  callers that don't wire the registry through). Set once by PageEditor. */
  enabledTypes: Set<string> | null;
  /** The content-type being templated, when the editor is a content-type
   *  template editor — its fields drive the picker's per-field suggestions, the
   *  `field` block's field-picker, and the text blocks' "insert field" helper.
   *  null in every other editor (pages/entries/chrome). */
  contentTypeContext: ContentTypeContext | null;

  init(blocks: BlockNode[], onChange: (blocks: BlockNode[]) => void, key?: string | null): void;
  apply(fn: (bs: BlockNode[]) => BlockNode[]): void;
  setDevice(device: Device): void;
  setEnabledTypes(types: Set<string> | null): void;
  setContentTypeContext(ctx: ContentTypeContext | null): void;

  select(id: string, mode?: "single" | "toggle" | "range"): void;
  clearSelection(): void;

  patch(id: string, content: Record<string, unknown>): void;
  move(id: string, dir: -1 | 1): void;
  insert(parentId: string | null, index: number, block: BlockNode): void;
  /** Drag-drop: pull a block from wherever it lives and splice it into a new parent/index. */
  dropMove(id: string, parentId: string | null, index: number): void;
  remove(id: string): void;
  duplicate(id: string): void;
  wrapInSection(id: string): void;

  bulkDelete(): void;
  bulkDuplicate(): void;
  bulkWrapInSection(): void;

  /** Save the current selection (same-parent siblings) as a reusable symbol and
   *  replace it in place with one linked instance. Returns the new symbol id, or
   *  null if the selection can't be saved (empty / cross-parent). */
  saveSelectionAsSymbol(name: string): Promise<string | null>;
  /** Insert a symbol instance at the current selection (or end of root). */
  insertSymbol(symbolId: string, label?: string): void;
  /** Replace a symbol instance with its resolved tree (fresh ids) — unlink it. */
  detachSymbol(id: string): Promise<void>;
};

export const useEditor = create<EditorState>((set, get) => ({
  blocks: [],
  selection: new Set(),
  lastSelected: null,
  onChange: null,
  readyFor: null,
  device: "desktop",
  enabledTypes: null,
  contentTypeContext: null,

  init(blocks, onChange, key = null) {
    set({ blocks, onChange, selection: new Set(), lastSelected: null, readyFor: key });
  },

  apply(fn) {
    const next = fn(get().blocks);
    set({ blocks: next });
    get().onChange?.(next);
  },

  setDevice: (device) => set({ device }),
  setEnabledTypes: (enabledTypes) => set({ enabledTypes }),
  setContentTypeContext: (contentTypeContext) => set({ contentTypeContext }),

  select(id, mode = "single") {
    const { selection, lastSelected, blocks } = get();
    if (mode === "toggle") {
      const next = new Set(selection);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      set({ selection: next, lastSelected: id });
      return;
    }
    if (mode === "range" && lastSelected) {
      const a = treeLocate(blocks, lastSelected);
      const b = treeLocate(blocks, id);
      // Range selection only among siblings of the same parent.
      if (a && b && a.parentId === b.parentId) {
        const parent = a.parentId ? treeFind(blocks, a.parentId) : null;
        const sibs = parent
          ? ((parent.content.blocks as BlockNode[]) ?? [])
          : blocks;
        const [lo, hi] = [Math.min(a.index, b.index), Math.max(a.index, b.index)];
        const next = new Set(selection);
        for (let i = lo; i <= hi; i++) next.add(sibs[i].id);
        set({ selection: next, lastSelected: id });
        return;
      }
    }
    set({ selection: new Set([id]), lastSelected: id });
  },

  clearSelection: () => set({ selection: new Set(), lastSelected: null }),

  patch(id, content) {
    get().apply((bs) => treeSetContent(bs, id, content));
  },
  move(id, dir) {
    get().apply((bs) => treeMove(bs, id, dir));
  },
  insert(parentId, index, block) {
    get().apply((bs) => treeInsert(bs, parentId, index, block));
    set({ selection: new Set([block.id]), lastSelected: block.id });
  },
  dropMove(id, parentId, index) {
    get().apply((bs) => {
      const { blocks: without, removed } = treeRemove(bs, id);
      if (!removed) return bs;
      return treeInsert(without, parentId, index, removed);
    });
  },
  remove(id) {
    get().apply((bs) => treeRemove(bs, id).blocks);
    const next = new Set(get().selection);
    next.delete(id);
    set({ selection: next });
  },
  duplicate(id) {
    get().apply((bs) => {
      const loc = treeLocate(bs, id);
      const orig = treeFind(bs, id);
      if (!loc || !orig) return bs;
      return treeInsert(bs, loc.parentId, loc.index + 1, cloneWithIds(orig));
    });
  },
  /** Wrap a single block in a fresh section, in place (single-select analog of bulkWrapInSection). */
  wrapInSection(id) {
    const { blocks } = get();
    const loc = treeLocate(blocks, id);
    const block = treeFind(blocks, id);
    if (!loc || !block) return;
    if (!canNest("section", block.type)) return;
    const parentType = loc.parentId ? treeFind(blocks, loc.parentId)?.type ?? null : null;
    if (!canNest(parentType, "section")) return;
    const wrapper: BlockNode = {
      id: newBlockId(),
      type: "section",
      content: { width: "contained", background: "none", py: "lg", blocks: [block] },
    };
    get().apply((bs) => {
      const { blocks: without } = treeRemove(bs, id);
      return treeInsert(without, loc.parentId, loc.index, wrapper);
    });
    set({ selection: new Set([wrapper.id]), lastSelected: wrapper.id });
  },

  bulkDelete() {
    const ids = [...get().selection];
    get().apply((bs) => ids.reduce((acc, id) => treeRemove(acc, id).blocks, bs));
    get().clearSelection();
  },

  bulkDuplicate() {
    const ids = [...get().selection];
    get().apply((bs) =>
      ids.reduce((acc, id) => {
        const loc = treeLocate(acc, id);
        const orig = treeFind(acc, id);
        if (!loc || !orig) return acc;
        return treeInsert(acc, loc.parentId, loc.index + 1, cloneWithIds(orig));
      }, bs),
    );
  },

  /** Wrap the selection (same-parent siblings only) into one new section. */
  bulkWrapInSection() {
    const { selection, blocks } = get();
    const ids = [...selection];
    if (!ids.length) return;
    const locs = ids
      .map((id) => ({ id, loc: treeLocate(blocks, id) }))
      .filter((x): x is { id: string; loc: NonNullable<ReturnType<typeof treeLocate>> } => !!x.loc);
    const parentId = locs[0]?.loc.parentId ?? null;
    if (!locs.every((x) => x.loc.parentId === parentId)) return;
    const parentType = parentId ? treeFind(blocks, parentId)?.type ?? null : null;
    if (!canNest(parentType, "section")) return;
    const members = ids.map((id) => treeFind(blocks, id)!).filter(Boolean);
    if (!members.every((m) => canNest("section", m.type))) return;

    const insertAt = Math.min(...locs.map((x) => x.loc.index));
    const wrapper: BlockNode = {
      id: newBlockId(),
      type: "section",
      content: { width: "contained", background: "none", py: "lg", blocks: members },
    };
    get().apply((bs) => {
      let acc = bs;
      for (const id of ids) acc = treeRemove(acc, id).blocks;
      return treeInsert(acc, parentId, insertAt, wrapper);
    });
    set({ selection: new Set([wrapper.id]), lastSelected: wrapper.id });
  },

  /** Save the selection as a symbol, then replace it with one linked instance.
   *  Same same-parent-siblings guard as bulkWrapInSection. The saved definition
   *  keeps the members' ids (stable override targeting); the instance gets a
   *  fresh id, as does every future insertion of this symbol. */
  async saveSelectionAsSymbol(name) {
    const { selection, blocks } = get();
    const ids = [...selection];
    if (!ids.length) return null;
    const locs = ids
      .map((id) => ({ id, loc: treeLocate(blocks, id) }))
      .filter((x): x is { id: string; loc: NonNullable<ReturnType<typeof treeLocate>> } => !!x.loc);
    const parentId = locs[0]?.loc.parentId ?? null;
    if (!locs.every((x) => x.loc.parentId === parentId)) return null;
    const members = ids.map((id) => treeFind(blocks, id)!).filter(Boolean);
    if (!members.length) return null;

    const created = await createSymbol(name, members);
    if (!created.ok || !created.data) return null;
    const symbolId = created.data.id;

    const insertAt = Math.min(...locs.map((x) => x.loc.index));
    const instance: BlockNode = {
      id: newBlockId(),
      type: "symbol",
      content: { symbolId, overrides: [], _label: name.trim() || "Saved block" },
    };
    get().apply((bs) => {
      let acc = bs;
      for (const id of ids) acc = treeRemove(acc, id).blocks;
      return treeInsert(acc, parentId, insertAt, instance);
    });
    set({ selection: new Set([instance.id]), lastSelected: instance.id });
    return symbolId;
  },

  insertSymbol(symbolId, label) {
    const instance: BlockNode = {
      id: newBlockId(),
      type: "symbol",
      content: { symbolId, overrides: [], ...(label ? { _label: label } : {}) },
    };
    const sel = [...get().selection];
    const loc = sel.length ? treeLocate(get().blocks, sel[0]!) : null;
    get().apply((bs) =>
      loc
        ? treeInsert(bs, loc.parentId, loc.index + 1, instance)
        : treeInsert(bs, null, get().blocks.length, instance),
    );
    set({ selection: new Set([instance.id]), lastSelected: instance.id });
  },

  async detachSymbol(id) {
    const node = treeFind(get().blocks, id);
    const loc = treeLocate(get().blocks, id);
    if (!node || !loc || node.type !== "symbol") return;
    const content = node.content as { symbolId?: string; overrides?: SymbolOverride[] };
    if (!content.symbolId) return;
    const res = await inlineSymbol(content.symbolId, content.overrides);
    if (!res.ok || !res.data) return;
    const inlined = res.data.blocks;
    get().apply((bs) => {
      const { blocks: without } = treeRemove(bs, id);
      // Splice the inlined blocks at the instance's former position, order-preserving.
      let acc = without;
      inlined.forEach((b, i) => {
        acc = treeInsert(acc, loc.parentId, loc.index + i, b);
      });
      return acc;
    });
    set({ selection: new Set(inlined.map((b) => b.id)) });
  },
}));

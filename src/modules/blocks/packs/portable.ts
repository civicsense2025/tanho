import { themeInputSchema, type ThemeInput } from "@/modules/theme/validation";
import { blockTreeSchema, MAX_TREE_BYTES, type BlockNodeInput } from "@/modules/pages/validation";
import { treeReferencedTypes } from "@/modules/pages/blocks-io";
import { filterPortableBlocks } from "@/modules/blocks/portability";
import type { BlockNode } from "@/blocks/types";

/**
 * Portable pack format — the unit a user exports, shares, sells, or imports,
 * and the shape marketplace listings use. Sibling to `oys-theme@1` and
 * `oys-site@1`.
 *
 *   kind: "block-pack"  → a reusable block tree (a section/hero/CTA stack).
 *   kind: "design-pack" → a theme + named page block trees (a full template).
 *
 * Carries only deployment-agnostic content: block trees (validated shape, with
 * unknown types preserved so they render as placeholders on installs that lack
 * them), the theme scalars (for design-packs), and declared `requiredBlockTypes`
 * so the destination can warn before import. No media bytes, no ids that must
 * collide, no site secrets. Bump PACK_FORMAT on incompatible shape changes.
 */
export const PACK_FORMAT = "oys-pack@1" as const;

export type PackKind = "block-pack" | "design-pack";

/** A symbol definition inlined into a pack. `id` is the ORIGINAL id at export;
 *  on import it's replaced with a fresh id and the trees' `symbolId`s remapped. */
export type PortableSymbol = {
  id: string;
  name: string;
  category?: string;
  icon?: string;
  blockTree: BlockNodeInput[];
};

/** Collect every `symbolId` referenced by a `symbol` node anywhere in a tree
 *  (recursing container children). Pure — no DB. */
export function collectSymbolIds(blocks: BlockNodeInput[]): string[] {
  const ids = new Set<string>();
  const walk = (nodes: BlockNodeInput[]) => {
    for (const n of nodes) {
      if (n.type === "symbol") {
        const sid = (n.content as { symbolId?: unknown }).symbolId;
        if (typeof sid === "string" && sid) ids.add(sid);
      }
      const kids = (n.content as { blocks?: unknown }).blocks;
      if (Array.isArray(kids)) walk(kids as BlockNodeInput[]);
    }
  };
  walk(blocks);
  return [...ids];
}

/** Rewrite every `symbol` node's `content.symbolId` through `idMap` (old→new).
 *  Pure; returns a new tree, leaves unmapped ids untouched (they'll dangle →
 *  placeholder, the same graceful-degradation contract as a missing type). */
export function remapSymbolIds(blocks: BlockNodeInput[], idMap: Record<string, string>): BlockNodeInput[] {
  const walk = (nodes: BlockNodeInput[]): BlockNodeInput[] =>
    nodes.map((n) => {
      const content: Record<string, unknown> = { ...n.content };
      if (n.type === "symbol") {
        const sid = content.symbolId;
        if (typeof sid === "string" && idMap[sid]) content.symbolId = idMap[sid];
      }
      if (Array.isArray(content.blocks)) {
        content.blocks = walk(content.blocks as BlockNodeInput[]);
      }
      return { ...n, content };
    });
  return walk(blocks);
}

export type PortablePack = {
  format: typeof PACK_FORMAT;
  kind: PackKind;
  name: string;
  description?: string;
  author?: string;
  version: number;
  license?: string;
  /** Block-pack: a single reusable block tree. Design-pack: omitted. */
  blocks?: BlockNodeInput[];
  /** Design-pack: named page block trees. Block-pack: omitted. */
  pages?: Array<{ name: string; blockTree: BlockNodeInput[] }>;
  /** Design-pack: the theme scalars. Block-pack: omitted. */
  theme?: ThemeInput;
  /** Symbol definitions referenced by any tree in this pack (by `symbolId`),
   *  inlined so the pack is self-contained. Collected at export from the DB;
   *  re-created with fresh ids on import (and every `content.symbolId` in the
   *  pack's trees is remapped to match). Absent when a pack references no symbols. */
  symbols?: PortableSymbol[];
  /** Every block type referenced anywhere in the pack (declared dependency). */
  requiredBlockTypes: string[];
  /** Types in the pack that need configuration on import (e.g. paywall, form,
   *  data-bound blocks). Empty for packs with only allowlisted content. */
  requiresConfigTypes?: string[];
  /** Types stripped from the tree during export (excluded by the allowlist).
   *  Present for transparency — the destination knows what was removed. */
  excludedTypes?: string[];
  generatedAt?: number;
};

export type PackImportResult =
  | {
    ok: true;
    name: string;
    kind: PackKind;
    /** Shape-validated trees; the caller must run `validatePackTree` to
     *  normalize per-type content and collect unknown-type diagnostics. */
    blocks?: BlockNodeInput[];
    pages?: Array<{ name: string; blockTree: BlockNodeInput[] }>;
    theme?: ThemeInput;
    /** Inlined symbol defs to recreate (with fresh ids) before installing trees. */
    symbols?: PortableSymbol[];
    requiredBlockTypes: string[];
    /** Types the exporter flagged as needing configuration on import. */
    requiresConfigTypes?: string[];
    /** Types the exporter stripped (excluded by its allowlist). */
    excludedTypes?: string[];
  }
  | { ok: false; error: string };

/** Serialize a block pack to a portable object (for a .pack.json). */
export function exportBlockPackJson(
  name: string,
  blocks: BlockNode[],
  meta: { description?: string; author?: string; license?: string; version?: number } = {},
  now: number,
): PortablePack {
  const { portable, requiresConfigTypes, excludedTypes } = filterPortableBlocks(blocks);
  return {
    format: PACK_FORMAT,
    kind: "block-pack",
    name: name.trim() || "Untitled block pack",
    description: meta.description,
    author: meta.author,
    license: meta.license,
    version: meta.version ?? 1,
    blocks: portable as unknown as BlockNodeInput[],
    requiredBlockTypes: treeReferencedTypes(portable),
    requiresConfigTypes,
    excludedTypes,
    generatedAt: now,
  };
}

/** Serialize a design pack (theme + named page trees) to a portable object. */
export function exportDesignPackJson(
  name: string,
  theme: ThemeInput,
  pages: Array<{ name: string; blockTree: BlockNode[] }>,
  meta: { description?: string; author?: string; license?: string; version?: number } = {},
  now: number,
): PortablePack {
  const required = new Set<string>();
  const requiresConfigTypes = new Set<string>();
  const excludedTypes = new Set<string>();
  const filteredPages = pages.map((p) => {
    const f = filterPortableBlocks(p.blockTree);
    for (const t of f.requiresConfigTypes) requiresConfigTypes.add(t);
    for (const t of f.excludedTypes) excludedTypes.add(t);
    for (const t of treeReferencedTypes(f.portable)) required.add(t);
    return { name: p.name, blockTree: f.portable as unknown as BlockNodeInput[] };
  });
  return {
    format: PACK_FORMAT,
    kind: "design-pack",
    name: name.trim() || "Untitled design pack",
    description: meta.description,
    author: meta.author,
    license: meta.license,
    version: meta.version ?? 1,
    theme: themeInputSchema.parse(theme),
    pages: filteredPages,
    requiredBlockTypes: [...required],
    requiresConfigTypes: [...requiresConfigTypes],
    excludedTypes: [...excludedTypes],
    generatedAt: now,
  };
}

/**
 * Validate an imported .pack.json. Fail-closed on the format tag and the
 * universal block-tree shape (zod `blockTreeSchema` + size cap); per-block
 * content/unknown-type handling is done by the caller via `validatePackTree`
 * (which keeps unknown types as placeholders). Returns the parsed, trusted
 * shape with block trees still as `BlockNodeInput[]` for the caller to
 * `validatePackTree`.
 */
export function importPackJson(raw: unknown): PackImportResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Not a pack file" };
  const obj = raw as Record<string, unknown>;
  if (obj.format !== PACK_FORMAT) {
    return { ok: false, error: `Unsupported pack format (expected ${PACK_FORMAT})` };
  }
  const kind = obj.kind as PackKind;
  if (kind !== "block-pack" && kind !== "design-pack") {
    return { ok: false, error: "Unknown pack kind" };
  }
  const name = typeof obj.name === "string" && obj.name.trim() ? obj.name.trim().slice(0, 120) : "Imported pack";

  if (kind === "block-pack") {
    const blocks = obj.blocks;
    if (!Array.isArray(blocks)) return { ok: false, error: "Block pack is missing its block tree" };
    if (JSON.stringify(blocks).length > MAX_TREE_BYTES) return { ok: false, error: "Pack content is too large" };
    const parsed = blockTreeSchema.safeParse(blocks);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid blocks" };
    const required = Array.isArray(obj.requiredBlockTypes)
      ? (obj.requiredBlockTypes as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
    const requiresConfigTypes = Array.isArray(obj.requiresConfigTypes)
      ? (obj.requiresConfigTypes as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
    const excludedTypes = Array.isArray(obj.excludedTypes)
      ? (obj.excludedTypes as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
    return { ok: true, name, kind, blocks: parsed.data, symbols: parseSymbols(obj.symbols), requiredBlockTypes: required, requiresConfigTypes, excludedTypes };
  }

  // design-pack
  const themeParse = themeInputSchema.safeParse(obj.theme);
  if (!themeParse.success) return { ok: false, error: "Design pack has an invalid theme" };
  const rawPages = Array.isArray(obj.pages) ? (obj.pages as Array<Record<string, unknown>>) : [];
  if (rawPages.length === 0) return { ok: false, error: "Design pack has no pages" };
  const pages: Array<{ name: string; blockTree: BlockNode[] }> = [];
  for (const p of rawPages) {
    const pname = typeof p.name === "string" ? p.name.slice(0, 120) : "Page";
    if (!Array.isArray(p.blockTree)) return { ok: false, error: `Design pack page "${pname}" has no block tree` };
    if (JSON.stringify(p.blockTree).length > MAX_TREE_BYTES) return { ok: false, error: "Pack content is too large" };
    const parsed = blockTreeSchema.safeParse(p.blockTree);
    if (!parsed.success) return { ok: false, error: `Design pack page "${pname}" has invalid blocks` };
    pages.push({ name: pname, blockTree: parsed.data });
  }
  const required = Array.isArray(obj.requiredBlockTypes)
    ? (obj.requiredBlockTypes as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const requiresConfigTypes = Array.isArray(obj.requiresConfigTypes)
    ? (obj.requiresConfigTypes as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const excludedTypes = Array.isArray(obj.excludedTypes)
    ? (obj.excludedTypes as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  return { ok: true, name, kind, theme: themeParse.data, pages, symbols: parseSymbols(obj.symbols), requiredBlockTypes: required, requiresConfigTypes, excludedTypes };
}

/** Shape-validate the pack's inlined symbol defs (lenient — each `blockTree` is
 *  re-validated at install). Ignores anything malformed. */
function parseSymbols(raw: unknown): PortableSymbol[] {
  if (!Array.isArray(raw)) return [];
  const out: PortableSymbol[] = [];
  for (const s of raw as Array<Record<string, unknown>>) {
    if (typeof s?.id !== "string" || !Array.isArray(s?.blockTree)) continue;
    const parsed = blockTreeSchema.safeParse(s.blockTree);
    if (!parsed.success) continue;
    out.push({
      id: s.id,
      name: typeof s.name === "string" ? s.name.slice(0, 120) : "Saved block",
      category: typeof s.category === "string" ? s.category : undefined,
      icon: typeof s.icon === "string" ? s.icon : undefined,
      blockTree: parsed.data,
    });
  }
  return out;
}

import { themeInputSchema, type ThemeInput } from "@/modules/theme/validation";
import { blockTreeSchema, MAX_TREE_BYTES, type BlockNodeInput } from "@/modules/pages/validation";
import { treeReferencedTypes } from "@/modules/pages/blocks-io";
import { filterPortableBlocks } from "../portability";
import type { BlockNode } from "@/blocks/types";

/**
 * Portable pack format — the unit a user exports, shares, sells, or imports,
 * and the shape marketplace listings use. Sibling to `lamina-theme@1` and
 * `lamina-site@1`.
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
export const PACK_FORMAT = "lamina-pack@1" as const;

export type PackKind = "block-pack" | "design-pack";

export type PackSymbol = {
  id: string;
  name: string;
  blockTree: BlockNodeInput[];
};

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
  /** Every block type referenced anywhere in the pack (declared dependency). */
  requiredBlockTypes: string[];
  /** Types in the kept tree that need configuration on the destination install. */
  requiresConfigTypes: string[];
  /** Types that were stripped from the tree because they are excluded. */
  excludedTypes: string[];
  /** Inlined reusable symbol definitions referenced by `symbol` blocks. */
  symbols?: PackSymbol[];
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
    requiredBlockTypes: string[];
    requiresConfigTypes: string[];
    excludedTypes: string[];
    symbols?: PackSymbol[];
  }
  | { ok: false; error: string };

function kidsOf(node: BlockNodeInput): BlockNodeInput[] {
  const blocks = node.content?.blocks;
  return Array.isArray(blocks) ? (blocks as BlockNodeInput[]) : [];
}

/** Collect every symbolId referenced by `symbol` blocks in the tree, deduped. */
export function collectSymbolIds(tree: BlockNodeInput[]): string[] {
  const ids = new Set<string>();
  const walk = (nodes: BlockNodeInput[]) => {
    for (const n of nodes) {
      if (n.type === "symbol" && typeof (n.content as { symbolId?: unknown }).symbolId === "string") {
        ids.add((n.content as { symbolId: string }).symbolId);
      }
      walk(kidsOf(n));
    }
  };
  walk(tree);
  return [...ids];
}

/** Deep-clone a tree and rewrite every symbolId through the provided map. */
export function remapSymbolIds(tree: BlockNodeInput[], map: Record<string, string>): BlockNodeInput[] {
  const walk = (nodes: BlockNodeInput[]): BlockNodeInput[] =>
    nodes.map((n) => {
      const mapped = walk(kidsOf(n));
      const content: Record<string, unknown> = { ...n.content };
      if (mapped.length) content.blocks = mapped;
      if (n.type === "symbol") {
        const symbolId = content.symbolId;
        if (typeof symbolId === "string" && map[symbolId]) {
          content.symbolId = map[symbolId];
        }
      }
      return { ...n, content };
    });
  return walk(tree);
}

/** Parse and validate an optional symbols array from a pack. */
function parseSymbols(raw: unknown): PackSymbol[] {
  if (!Array.isArray(raw)) return [];
  const out: PackSymbol[] = [];
  for (const s of raw) {
    if (!s || typeof s !== "object") continue;
    const id = typeof (s as { id?: unknown }).id === "string" ? (s as { id: string }).id : "";
    const name = typeof (s as { name?: unknown }).name === "string" ? (s as { name: string }).name : "";
    const blockTree = (s as { blockTree?: unknown }).blockTree;
    if (!Array.isArray(blockTree)) continue;
    const parsed = blockTreeSchema.safeParse(blockTree);
    if (!parsed.success) continue;
    out.push({ id, name, blockTree: parsed.data });
  }
  return out;
}

/** Serialize a block pack to a portable object (for a .pack.json). */
export function exportBlockPackJson(
  name: string,
  blocks: BlockNode[],
  meta: { description?: string; author?: string; license?: string; version?: number } = {},
  now: number,
  symbols?: PackSymbol[],
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
    symbols,
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
  symbols?: PackSymbol[],
): PortablePack {
  const required = new Set<string>();
  const requiresConfigTypes = new Set<string>();
  const excludedTypes = new Set<string>();
  const portablePages = pages.map((p) => {
    const r = filterPortableBlocks(p.blockTree);
    for (const t of r.requiresConfigTypes) requiresConfigTypes.add(t);
    for (const t of r.excludedTypes) excludedTypes.add(t);
    for (const t of treeReferencedTypes(r.portable)) required.add(t);
    return { name: p.name, blockTree: r.portable as unknown as BlockNodeInput[] };
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
    pages: portablePages,
    requiredBlockTypes: [...required],
    requiresConfigTypes: [...requiresConfigTypes],
    excludedTypes: [...excludedTypes],
    symbols,
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

  const readStrings = (key: string): string[] =>
    Array.isArray(obj[key])
      ? (obj[key] as unknown[]).filter((x): x is string => typeof x === "string")
      : [];

  if (kind === "block-pack") {
    const blocks = obj.blocks;
    if (!Array.isArray(blocks)) return { ok: false, error: "Block pack is missing its block tree" };
    if (JSON.stringify(blocks).length > MAX_TREE_BYTES) return { ok: false, error: "Pack content is too large" };
    const parsed = blockTreeSchema.safeParse(blocks);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid blocks" };
    return {
      ok: true,
      name,
      kind,
      blocks: parsed.data,
      requiredBlockTypes: readStrings("requiredBlockTypes"),
      requiresConfigTypes: readStrings("requiresConfigTypes"),
      excludedTypes: readStrings("excludedTypes"),
      symbols: parseSymbols(obj.symbols),
    };
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
  return {
    ok: true,
    name,
    kind,
    theme: themeParse.data,
    pages,
    requiredBlockTypes: readStrings("requiredBlockTypes"),
    requiresConfigTypes: readStrings("requiresConfigTypes"),
    excludedTypes: readStrings("excludedTypes"),
    symbols: parseSymbols(obj.symbols),
  };
}

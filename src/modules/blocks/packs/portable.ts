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
    return { ok: true, name, kind, blocks: parsed.data, requiredBlockTypes: required, requiresConfigTypes, excludedTypes };
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
  return { ok: true, name, kind, theme: themeParse.data, pages, requiredBlockTypes: required, requiresConfigTypes, excludedTypes };
}

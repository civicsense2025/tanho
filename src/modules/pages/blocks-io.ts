import { blockDef } from "@/blocks/registry";
import { isContainer, kidsOf } from "@/blocks/tree";
import { sanitizeCss, sanitizeAdvancedDecls } from "@/lib/css-sanitizer";
import type { BlockNode } from "@/blocks/types";
import type { Gate } from "@/modules/entitlements/gate";
import { blockTreeSchema, MAX_TREE_BYTES, type BlockNodeInput } from "./validation";

/**
 * Store-time sanitisation of the raw-CSS escape hatch: layout blocks may carry a
 * free-form `customCss` string. We persist ONLY the sanitised form (AST-rebuilt,
 * property/selector/url allow-listed, page-root scoped — see lib/css-sanitizer),
 * so a malicious string never survives in the DB. It is re-sanitised again on render
 * (BlockRenderer) as defence in depth, mirroring the tree's save+render double-check.
 * Mutates the parsed content in place (it's the fresh zod-parsed copy).
 */
function sanitizeCustomCss(content: Record<string, unknown>): void {
  if (typeof content.customCss === "string" && content.customCss !== "") {
    content.customCss = sanitizeCss(content.customCss);
  }
}

/**
 * Store-time sanitisation of the raw-value `advancedStyle` bucket (the px/hex escape
 * hatch that complements the token style layer). Each breakpoint's `{prop: value}` map
 * is cleaned via `sanitizeAdvancedDecls` (same ALLOWED_PROPS + isSafeValue gates as
 * customCss) so only safe pairs persist; re-cleaned again on render (BlockRenderer).
 * Mutates in place; drops an emptied layer/bucket so it doesn't linger as `{}`.
 */
function sanitizeAdvancedStyle(content: Record<string, unknown>): void {
  const adv = content.advancedStyle;
  if (!adv || typeof adv !== "object") return;
  const next: Record<string, Record<string, string>> = {};
  for (const bp of ["base", "tablet", "desktop"] as const) {
    const layer = (adv as Record<string, unknown>)[bp];
    if (layer && typeof layer === "object") {
      const clean = sanitizeAdvancedDecls(layer);
      if (Object.keys(clean).length) next[bp] = clean;
    }
  }
  if (Object.keys(next).length) content.advancedStyle = next;
  else delete content.advancedStyle;
}

/**
 * Validates a whole incoming block tree: shape via zod, then each node's
 * content against its registry schema (unknown types and invalid content
 * are rejected — fail closed at the write boundary, not just at render).
 * Returns the normalized tree (schema-parsed content with defaults).
 */
export function validateBlockTree(input: unknown):
  | { ok: true; blocks: BlockNode[] }
  | { ok: false; error: string } {
  if (JSON.stringify(input ?? []).length > MAX_TREE_BYTES) {
    return { ok: false, error: "Page content is too large" };
  }
  const parsed = blockTreeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid blocks" };
  }

  const normalize = (nodes: BlockNodeInput[]): BlockNode[] | string => {
    const out: BlockNode[] = [];
    for (const node of nodes) {
      const def = blockDef(node.type);
      if (!def) return `Unknown block type: ${node.type}`;
      const c = def.schema.safeParse(node.content);
      if (!c.success) {
        return `Invalid ${node.type} block: ${c.error.issues[0]?.message ?? "bad content"}`;
      }
      const content = c.data as Record<string, unknown>;
      sanitizeCustomCss(content);
      sanitizeAdvancedStyle(content);
      const asNode: BlockNode = { id: node.id, type: node.type, content };
      if (isContainer(asNode)) {
        const kids = normalize(kidsOf(asNode) as BlockNodeInput[]);
        if (typeof kids === "string") return kids;
        content.blocks = kids;
      }
      out.push(asNode);
    }
    return out;
  };

  const result = normalize(parsed.data);
  return typeof result === "string" ? { ok: false, error: result } : { ok: true, blocks: result };
}

/** Does any block in the tree gate content (paywall)? Computed at publish. */
export function treeHasPaywall(blocks: BlockNode[]): boolean {
  for (const b of blocks) {
    if (b.type === "paywall") return true;
    if (isContainer(b) && treeHasPaywall(kidsOf(b))) return true;
  }
  return false;
}

/**
 * The Gate a reader needs to pass to read past the FIRST paywall anywhere in
 * the tree, or null if the tree has none — a UI-only signal (the search
 * results page's "members only" badge, mirroring postlist/resolve.ts's
 * existing `locked: r.hasPaywall` lock glyph), NOT a second enforcement
 * layer. Real enforcement stays exactly where it already is: the page
 * render's own walker (BlockRenderer) and, for search specifically,
 * indexBlockTree's own visibleBlocksFor(null, ...) walk, which already
 * limits indexed BODY TEXT to what an anonymous viewer can see regardless of
 * what this function reports. Depth-first, first-found order (matches
 * treeHasPaywall's own "any paywall anywhere" trigger) — a page with several
 * paywalls at different tiers is reported by its outermost/first one, since
 * that is the gate that determines whether the reader sees anything beyond
 * the teaser at all.
 */
export function resolveTreeGate(blocks: BlockNode[]): Gate | null {
  for (const b of blocks) {
    if (b.type === "paywall") {
      const tier = typeof (b.content as { tier?: unknown }).tier === "string" ? (b.content as { tier: string }).tier : "";
      return { kind: "membership", tier };
    }
    if (isContainer(b)) {
      const nested = resolveTreeGate(kidsOf(b));
      if (nested) return nested;
    }
  }
  return null;
}

/**
 * Pack-import validation — the lenient counterpart to `validateBlockTree`. Used
 * when importing a portable block pack (.oys-pack.json): unknown block types
 * (no compiled def on this install) are KEPT in the tree so they render as a
 * graceful "unsupported block" placeholder rather than rejecting the whole
 * pack — the "import never breaks the site" guarantee. Known types are still
 * schema-validated; a known type with invalid content is DROPPED (recorded in
 * `dropped`) rather than failing the whole import.
 *
 * Returns the normalized tree plus diagnostics. The caller decides whether to
 * surface missingTypes/dropped to the user (the import still succeeds).
 */
export function validatePackTree(input: unknown):
  | { ok: true; blocks: BlockNode[]; missingTypes: string[]; dropped: string[] }
  | { ok: false; error: string } {
  if (JSON.stringify(input ?? []).length > MAX_TREE_BYTES) {
    return { ok: false, error: "Pack content is too large" };
  }
  const parsed = blockTreeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid blocks" };
  }

  const missing = new Set<string>();
  const dropped: string[] = [];

  const normalize = (nodes: BlockNodeInput[]): BlockNode[] => {
    const out: BlockNode[] = [];
    for (const node of nodes) {
      const def = blockDef(node.type);
      if (!def) {
        // Unknown type — keep it; it'll render as a placeholder. Track it.
        missing.add(node.type);
        const asNode: BlockNode = { id: node.id, type: node.type, content: node.content };
        if (isContainer(asNode)) {
          const kids = normalize(kidsOf(asNode) as BlockNodeInput[]);
          (asNode.content as { blocks?: BlockNode[] }).blocks = kids;
        }
        out.push(asNode);
        continue;
      }
      const c = def.schema.safeParse(node.content);
      if (!c.success) {
        // Known type, invalid content — drop this block (don't fail the pack).
        dropped.push(node.type);
        continue;
      }
      const content = c.data as Record<string, unknown>;
      sanitizeCustomCss(content);
      sanitizeAdvancedStyle(content);
      const asNode: BlockNode = { id: node.id, type: node.type, content };
      if (isContainer(asNode)) {
        const kids = normalize(kidsOf(asNode) as BlockNodeInput[]);
        content.blocks = kids;
      }
      out.push(asNode);
    }
    return out;
  };

  const blocks = normalize(parsed.data);
  return { ok: true, blocks, missingTypes: [...missing], dropped };
}

/** Collect every block type referenced anywhere in a tree (for requiredTypes). */
export function treeReferencedTypes(blocks: BlockNode[]): string[] {
  const types = new Set<string>();
  const walk = (nodes: BlockNode[]) => {
    for (const b of nodes) {
      types.add(b.type);
      if (isContainer(b)) walk(kidsOf(b));
    }
  };
  walk(blocks);
  return [...types];
}


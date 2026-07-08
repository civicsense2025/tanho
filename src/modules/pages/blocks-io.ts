import { blockDef } from "@/blocks/registry";
import { isContainer, kidsOf } from "@/blocks/tree";
import type { BlockNode } from "@/blocks/types";
import type { Gate } from "@/modules/entitlements/gate";
import { blockTreeSchema, MAX_TREE_BYTES, type BlockNodeInput } from "./validation";

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
 * when importing a portable block pack (.lamina-pack.json): unknown block types
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


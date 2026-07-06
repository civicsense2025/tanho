import type { BlockNode } from "../types";
import { isContainer, kidsOf } from "../tree";
import type { SymbolOverride } from "./fields";

/** Bound on symbol nesting depth — a backstop against pathological (but acyclic)
 * deep nesting, checked alongside the per-id cycle guard in the walker. */
export const MAX_SYMBOL_DEPTH = 8;

/** Why a symbol instance can/can't expand, decided BEFORE any DB fetch. Pure and
 * exhaustively testable; the walker turns "block"/"cycle"/"deep"/"unset" into a
 * placeholder (editor) or null (public), and only fetches when "ok". */
export type ExpandDecision = "ok" | "unset" | "cycle" | "deep";

export function decideExpansion(symbolId: string, symbolStack: string[] | undefined): ExpandDecision {
  const stack = symbolStack ?? [];
  if (!symbolId) return "unset";
  if (stack.includes(symbolId)) return "cycle";
  if (stack.length >= MAX_SYMBOL_DEPTH) return "deep";
  return "ok";
}

/** Shallow content merge: `patch` keys win over the block's own content. */
function mergeContent(
  content: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return { ...content, ...patch };
}

/**
 * Apply per-instance overrides onto a deep copy of a symbol's definition tree,
 * keyed by each override's `targetId` = the stable id of a block WITHIN the def.
 *
 * Drift-safe by construction: an override whose `targetId` isn't found in the
 * current tree is simply never applied (the author deleted/replaced that block).
 * The merge is shallow content-only — it can't add/remove blocks. A patched
 * block is still re-validated by the walker's own `def.schema.safeParse`, so a
 * bad patch blanks only that child, never its siblings.
 *
 * Pure: never mutates the input tree (returns a fresh, structurally-cloned tree).
 * This is the same tree-patch-by-id operation the collection/repeater reuses for
 * per-record binding, so it's factored to be shared.
 */
export function applyOverrides(tree: BlockNode[], overrides?: SymbolOverride[]): BlockNode[] {
  const byId = new Map((overrides ?? []).map((o) => [o.targetId, o.patch]));
  const walk = (nodes: BlockNode[]): BlockNode[] =>
    nodes.map((n) => {
      const patch = byId.get(n.id);
      const content = patch ? mergeContent(n.content, patch) : { ...n.content };
      const next: BlockNode = { ...n, content };
      if (isContainer(next)) {
        (next.content as { blocks?: BlockNode[] }).blocks = walk(kidsOf(next));
      }
      return next;
    });
  return walk(tree);
}

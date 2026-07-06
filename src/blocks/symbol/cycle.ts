import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { symbols } from "@/modules/blocks/schema";
import { isContainer, kidsOf } from "../tree";
import type { BlockNode } from "../types";

/** Collect every `symbolId` referenced by any `symbol` node in a tree (recursing
 * into container children). Pure. */
export function referencedSymbolIds(tree: BlockNode[]): string[] {
  const ids: string[] = [];
  const walk = (nodes: BlockNode[]) => {
    for (const n of nodes) {
      if (n.type === "symbol") {
        const sid = (n.content as { symbolId?: unknown }).symbolId;
        if (typeof sid === "string" && sid) ids.push(sid);
      }
      if (isContainer(n)) walk(kidsOf(n));
    }
  };
  walk(tree);
  return ids;
}

/**
 * True if saving `tree` as symbol `selfId` would create a reference cycle — i.e.
 * `selfId` appears anywhere in the transitive closure of symbols this tree
 * references. The SAVE-time half of the cycle defense (the render walker's
 * `symbolStack` is the other half). Bounded by the finite set of symbol ids, so
 * it always terminates even if the stored data already contains a cycle.
 */
export async function symbolReferencesSelf(selfId: string, tree: BlockNode[]): Promise<boolean> {
  const seen = new Set<string>();
  let frontier = referencedSymbolIds(tree);
  while (frontier.length) {
    const next: string[] = [];
    for (const id of frontier) {
      if (id === selfId) return true;
      if (seen.has(id)) continue;
      seen.add(id);
      const row = await db.query.symbols.findFirst({
        where: eq(symbols.id, id),
        columns: { blockTree: true },
      });
      if (row?.blockTree) next.push(...referencedSymbolIds(row.blockTree));
    }
    frontier = next;
  }
  return false;
}

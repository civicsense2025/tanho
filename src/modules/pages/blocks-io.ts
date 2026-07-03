import { blockDef } from "@/blocks/registry";
import { isContainer, kidsOf } from "@/blocks/tree";
import type { BlockNode } from "@/blocks/types";
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

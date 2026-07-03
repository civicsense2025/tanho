import { createId } from "@paralleldrive/cuid2";
import { blockSets } from "../../src/modules/pages/schema";
import type { SeedDb } from "../lib";

/** A block node in the {id, type, content} shape the renderer expects. */
export type Block = { id: string; type: string; content: Record<string, unknown> };

/** Build a block with a fresh cuid2 id (PB.uid-style `b_` prefix). */
export const b = (type: string, content: Record<string, unknown>): Block => ({
  id: `b_${createId()}`,
  type,
  content,
});

/** richtext block from raw HTML (sanitized on render by src). */
export const rich = (html: string): Block => b("richtext", { md: "", html });

/** richtext block from markdown. */
export const md = (text: string): Block => b("richtext", { md: text, html: "" });

/**
 * Write a block tree to both draft + published variants for an owner, so the
 * page renders publicly (published) and edits in the admin (draft). Idempotent:
 * onConflictDoUpdate replaces the tree for (ownerType, ownerId, variant).
 */
export async function putBlockSets(
  db: SeedDb,
  ownerType: string,
  ownerId: string,
  blocks: Block[],
): Promise<void> {
  for (const variant of ["draft", "published"] as const) {
    await db
      .insert(blockSets)
      .values({ ownerType, ownerId, variant, blocks, savedAt: Date.now() })
      .onConflictDoUpdate({
        target: [blockSets.ownerType, blockSets.ownerId, blockSets.variant],
        set: { blocks, savedAt: Date.now() },
      });
  }
}

"use server";

import { updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { validateBlockTree } from "@/modules/pages/blocks-io";
import { cloneWithIds } from "@/blocks/tree";
import { applyOverrides } from "@/blocks/symbol/expand";
import { symbolReferencesSelf } from "@/blocks/symbol/cycle";
import type { SymbolOverride } from "@/blocks/symbol/fields";
import { symbols, type SymbolRow } from "./schema";
import type { BlockNode } from "@/blocks/types";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/** Revalidate a symbol's cache tag → every linked instance re-expands with the
 * new definition on the next render (this is what makes edit-once-update-all work). */
function invalidate(id: string) {
  updateTag("symbols");
  updateTag(`symbols:${id}`);
}

/**
 * Create a new symbol from a block tree (the editor's "save selection as block").
 * The tree is validated (strict — same as a page save) so a symbol can never hold
 * an unrenderable block. Ids are preserved from the source blocks so per-instance
 * override targeting (which keys on child id) is stable.
 */
export async function createSymbol(
  name: string,
  tree: unknown,
): Promise<Result<{ id: string }>> {
  const user = await requireUser();
  const trimmed = name.trim().slice(0, 120) || "Saved block";
  const validated = validateBlockTree(tree);
  if (!validated.ok) return { ok: false, error: validated.error };

  const [row] = await db
    .insert(symbols)
    .values({ name: trimmed, blockTree: validated.blocks, category: "content", icon: "component" })
    .returning({ id: symbols.id });
  if (!row) return { ok: false, error: "Failed to create symbol" };

  await writeAudit({ userId: user.id, action: "symbol.create", ownerType: "symbol", ownerId: row.id });
  invalidate(row.id);
  return { ok: true, data: { id: row.id } };
}

/**
 * Save an edited symbol definition. Bumps `version` and revalidates so linked
 * instances pick it up. Rejects a tree that (transitively) references its own id
 * — a symbol containing itself would infinite-loop the render walker. This is the
 * SAVE-time half of the cycle defense (the render walker has the other half).
 */
export async function saveSymbol(id: string, tree: unknown): Promise<Result> {
  const user = await requireUser();
  const existing = await db.query.symbols.findFirst({ where: eq(symbols.id, id) });
  if (!existing) return { ok: false, error: "Symbol not found" };

  const validated = validateBlockTree(tree);
  if (!validated.ok) return { ok: false, error: validated.error };

  if (await symbolReferencesSelf(id, validated.blocks)) {
    return { ok: false, error: "A saved block can't contain itself" };
  }

  await db
    .update(symbols)
    .set({ blockTree: validated.blocks, version: existing.version + 1, updatedAt: Date.now() })
    .where(eq(symbols.id, id));

  await writeAudit({ userId: user.id, action: "symbol.save", ownerType: "symbol", ownerId: id });
  invalidate(id);
  return { ok: true };
}

/**
 * Resolve a symbol instance to a detached, INDEPENDENT block tree — the tree the
 * editor splices in place of the instance on "Detach". Applies the instance's
 * overrides, then re-ids every block (cloneWithIds) so the inlined copy shares no
 * ids with the still-linked instances elsewhere. Nested symbols stay linked
 * (detach is one level — Figma's behaviour).
 */
export async function inlineSymbol(
  symbolId: string,
  overrides?: SymbolOverride[],
): Promise<Result<{ blocks: BlockNode[] }>> {
  const row = await db.query.symbols.findFirst({ where: eq(symbols.id, symbolId) });
  if (!row) return { ok: false, error: "Symbol not found" };
  const resolved = applyOverrides(row.blockTree, overrides);
  const inlined = resolved.map((b) => cloneWithIds(b));
  return { ok: true, data: { blocks: inlined } };
}

/** Read a symbol definition for the symbol editor. */
export async function getSymbol(id: string): Promise<SymbolRow | null> {
  await requireUser();
  const row = await db.query.symbols.findFirst({ where: eq(symbols.id, id) });
  return row ?? null;
}

/** List symbols for the picker (metadata only — not the trees). */
export async function listSymbols(): Promise<Array<Pick<SymbolRow, "id" | "name" | "category" | "icon">>> {
  await requireUser();
  const rows = await db.query.symbols.findMany({
    columns: { id: true, name: true, category: true, icon: true },
  });
  return rows;
}

/** Delete a symbol. Existing instances degrade to the "missing symbol" placeholder
 * (same contract as any missing block type) — deletion is not blocked. */
export async function deleteSymbol(id: string): Promise<Result> {
  const user = await requireUser();
  await db.delete(symbols).where(eq(symbols.id, id));
  await writeAudit({ userId: user.id, action: "symbol.delete", ownerType: "symbol", ownerId: id });
  invalidate(id);
  return { ok: true };
}

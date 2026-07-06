"use client";

import { BlockCanvasEditor } from "./BlockCanvasEditor";
import { saveSymbol } from "@/modules/blocks/symbol-actions";
import type { BlockNode } from "@/blocks/types";

/**
 * The saved-block (symbol) editor. Reuses the owner-agnostic BlockCanvasEditor —
 * a symbol is "just another block-tree owner" (ownerType "symbol"). Saving runs
 * saveSymbol, which validates, bumps the version, and revalidates the symbol's
 * cache tag → every linked instance re-expands with the edit (edit-once-update-all).
 */
export function SymbolEditor({
  id,
  name,
  initialBlocks,
  enabledTypes,
}: {
  id: string;
  name: string;
  initialBlocks: BlockNode[];
  enabledTypes?: string[];
}) {
  return (
    <BlockCanvasEditor
      ownerType="symbol"
      ownerId={id}
      initialBlocks={initialBlocks}
      enabledTypes={enabledTypes}
      screenLabel={`symbol:${id}`}
      settingsLabel="Block"
      settingsPanel={
        <div style={{ padding: "var(--space-4)" }}>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            Editing the saved block <strong>{name}</strong>. Changes apply to every
            place this block is used.
          </p>
        </div>
      }
      onSaveBlocks={async (tree) => {
        const res = await saveSymbol(id, tree);
        return res.ok ? { ok: true } : { ok: false, error: res.error };
      }}
    />
  );
}

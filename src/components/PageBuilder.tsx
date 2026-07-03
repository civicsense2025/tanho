"use client";

import { blockEditors } from "@/lib/blocks/editors";
import { StylePanel } from "@/lib/blocks/editors/StylePanel";
import { BLOCK_TYPES, type Block, type BlockType } from "@/lib/blocks/types";
import { getBlockSpec } from "@/lib/blocks/registry";
import type { StyleProps } from "@/lib/blocks/core/style-schema";
import { Button } from "@/components/ui";

interface Props {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  onUpload: (file: File) => Promise<string>;
}

/** A freshly-added block's content is the spec's own `defaultContent` (the single source of
 * truth in each kind's spec), cloned so blocks never share a mutable default object. Replaces the
 * old hardcoded DEFAULT_CONTENT map that duplicated every spec — the six-location drift
 * `defineBlock` exists to prevent. */
function defaultContentFor(type: BlockType): Record<string, unknown> {
  const spec = getBlockSpec(type);
  return structuredClone((spec?.defaultContent as Record<string, unknown>) ?? {});
}

/** Generic block-tree editor consuming the shared block-type registry.
 * Replaces the case-study block editor that used to live embedded in
 * ProjectForm -- same component now used for any block-backed content. */
export function PageBuilder({ blocks, onChange, onUpload }: Props) {
  function addBlock(type: BlockType) {
    onChange([...blocks, { type, content: defaultContentFor(type), sortOrder: blocks.length }]);
  }

  function updateBlock(i: number, content: Record<string, unknown>) {
    onChange(blocks.map((b, idx) => (idx === i ? { ...b, content } : b)));
  }

  /** Patch a block's non-content fields (style/variant) while preserving the rest. Threaded to
   * the style panel; kept separate from updateBlock so a content edit never clobbers style. */
  function patchBlock(i: number, patch: Partial<Pick<Block, "style" | "variant">>) {
    onChange(blocks.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }

  function removeBlock(i: number) {
    onChange(blocks.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {blocks.map((block, i) => {
          const Editor = blockEditors[block.type];
          const spec = getBlockSpec(block.type);
          return (
            <div key={i} style={{ padding: "var(--space-4)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)" }}>{block.type}</span>
                <button
                  type="button"
                  onClick={() => removeBlock(i)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}
                >
                  Remove
                </button>
              </div>
              {Editor && <Editor content={block.content} onChange={(c) => updateBlock(i, c as Record<string, unknown>)} onUpload={onUpload} />}
              {/* Shared style controls — collapsed by default so the content stays the focus.
                  styleCaps (inverted default) decides which controls this block exposes. */}
              <details>
                <summary style={{ cursor: "pointer", fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)" }}>
                  Style
                </summary>
                <StylePanel
                  style={block.style}
                  caps={spec?.styleCaps}
                  onChange={(style: StyleProps) => patchBlock(i, { style })}
                />
              </details>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
        {BLOCK_TYPES.map((t) => (
          <Button key={t} type="button" variant="outline" size="sm" onClick={() => addBlock(t)}>
            + {t}
          </Button>
        ))}
      </div>
    </div>
  );
}

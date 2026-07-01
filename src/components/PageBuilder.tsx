"use client";

import { blockEditors } from "@/lib/blocks/editors";
import { BLOCK_TYPES, type Block, type BlockType } from "@/lib/blocks/types";
import { Button } from "@/components/ui";

interface Props {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  onUpload: (file: File) => Promise<string>;
}

const DEFAULT_CONTENT: Record<BlockType, Record<string, unknown>> = {
  text: {},
  image: {},
  video: {},
  metric: { metrics: [{ label: "", value: "" }] },
  gallery: { images: [] },
  richtext: {},
  code: {},
  callout: {},
  checklist: { items: [] },
};

/** Generic block-tree editor consuming the shared block-type registry.
 * Replaces the case-study block editor that used to live embedded in
 * ProjectForm -- same component now used for any block-backed content. */
export function PageBuilder({ blocks, onChange, onUpload }: Props) {
  function addBlock(type: BlockType) {
    onChange([...blocks, { type, content: DEFAULT_CONTENT[type], sortOrder: blocks.length }]);
  }

  function updateBlock(i: number, content: Record<string, unknown>) {
    onChange(blocks.map((b, idx) => (idx === i ? { ...b, content } : b)));
  }

  function removeBlock(i: number) {
    onChange(blocks.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {blocks.map((block, i) => {
          const Editor = blockEditors[block.type];
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

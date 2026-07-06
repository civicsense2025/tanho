"use client";

import { useEditor } from "./store";

/**
 * A compact "insert a field token" dropdown shown under a text input in the
 * Inspector — but ONLY when the editor is templating a content type (its
 * `contentTypeContext` is set). Picking a field appends `{{field}}` to the
 * text, so an owner can write "{{title}} — ${{price}}" without remembering
 * the token syntax. Renders nothing (no-op) in page/entry/chrome editors.
 */
export function InsertFieldToken({ onInsert }: { onInsert: (token: string) => void }) {
  const ctx = useEditor((s) => s.contentTypeContext);
  if (!ctx || ctx.fields.length === 0) return null;

  return (
    <select
      value=""
      onChange={(e) => {
        if (e.target.value) onInsert(`{{${e.target.value}}}`);
        e.currentTarget.selectedIndex = 0; // reset to the prompt
      }}
      aria-label="Insert a field token"
      style={{
        marginTop: "6px",
        width: "100%",
        fontSize: "var(--text-xs)",
        color: "var(--text-muted)",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xs)",
        padding: "4px 6px",
        appearance: "none",
        WebkitAppearance: "none",
        cursor: "pointer",
      }}
    >
      <option value="">+ Insert field…</option>
      {ctx.fields.map((f) => (
        <option key={f.key} value={f.key}>
          {f.label} → {`{{${f.key}}}`}
        </option>
      ))}
    </select>
  );
}

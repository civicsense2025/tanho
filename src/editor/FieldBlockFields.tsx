"use client";

import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { useEditor } from "./store";
import shell from "./editor-shell.module.css";

/**
 * Inspector controls for the `field` block (a content-type field rendered from
 * the current row). Special-cased in the Inspector like EmbedUrlField, because
 * a bound block's content is otherwise read-only — but the owner still needs to
 * choose WHICH field and how to display it. The field dropdown is populated from
 * the editor's `contentTypeContext` (the type being templated); outside a
 * content-type template editor there's no context, so it falls back to a plain
 * text input for the field key.
 */
export function FieldBlockFields({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const ctx = useEditor((s) => s.contentTypeContext);
  const set = (patch: Record<string, unknown>) => onChange({ ...content, ...patch });

  const field = typeof content.field === "string" ? content.field : "";
  const display = typeof content.display === "string" ? content.display : "auto";
  const level = typeof content.level === "string" ? content.level : "h2";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <Field label="Field" hint="Which content-type field to show">
        {ctx && ctx.fields.length > 0 ? (
          <Select value={field} onChange={(e) => set({ field: e.target.value })}>
            <option value="">— pick a field —</option>
            {ctx.fields.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </Select>
        ) : (
          <Input value={field} onChange={(e) => set({ field: e.target.value })} placeholder="field key" />
        )}
      </Field>

      <Field label="Display">
        <Select value={display} onChange={(e) => set({ display: e.target.value })}>
          <option value="auto">Plain text</option>
          <option value="heading">Heading</option>
          <option value="label-value">Label + value</option>
        </Select>
      </Field>

      {display === "heading" ? (
        <Field label="Heading level">
          <Select value={level} onChange={(e) => set({ level: e.target.value })}>
            <option value="h1">H1</option>
            <option value="h2">H2</option>
            <option value="h3">H3</option>
            <option value="h4">H4</option>
          </Select>
        </Field>
      ) : null}

      {display === "label-value" ? (
        <Field label="Label override" hint="Defaults to the field's own label">
          <Input
            value={typeof content.label === "string" ? content.label : ""}
            onChange={(e) => set({ label: e.target.value })}
          />
        </Field>
      ) : null}

      <div className={shell.pairGrid}>
        <Field label="Prefix" hint="e.g. $">
          <Input
            value={typeof content.prefix === "string" ? content.prefix : ""}
            onChange={(e) => set({ prefix: e.target.value })}
          />
        </Field>
        <Field label="Suffix" hint="e.g. /mo">
          <Input
            value={typeof content.suffix === "string" ? content.suffix : ""}
            onChange={(e) => set({ suffix: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

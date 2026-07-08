"use client";

import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/core/Button";
import { FieldControl } from "./fields";
import type { FieldDescriptor } from "./field-descriptors";
import type { SaveState } from "@/editor/useAutosave";
import type { EntryDraft } from "./EntryBlockEditor";

export function EntrySettingsPanel({
  draft,
  patch,
  patchDataField,
  descriptors,
  label,
  saveState,
  errorMessage,
  onDelete,
}: {
  draft: EntryDraft;
  patch: (partial: Partial<EntryDraft>) => void;
  patchDataField: (key: string, value: unknown) => void;
  descriptors: FieldDescriptor[];
  label: string;
  saveState: SaveState;
  errorMessage: string | null;
  onDelete: () => void;
}) {
  const saveHint =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? errorMessage ?? "Save failed"
          : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 4 }}>
        {label} details
      </div>

      <Field label="Title">
        <Input
          value={draft.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder={`Untitled ${label.toLowerCase()}`}
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
        <Field label="Slug" hint="Lowercase, dashes">
          <Input
            value={draft.slug}
            onChange={(e) => patch({ slug: e.target.value })}
            placeholder="my-item"
          />
        </Field>

        <Field label="Status">
          <Select
            value={draft.status}
            onChange={(e) => patch({ status: e.target.value as EntryDraft["status"] })}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </Select>
        </Field>
      </div>

      {descriptors.map((d) => (
        <FieldControl
          key={d.key}
          descriptor={d}
          value={draft.data[d.key]}
          onChange={(v) => patchDataField(d.key, v)}
        />
      ))}

      {saveHint ? (
        <div style={{ fontSize: "var(--text-xs)", color: saveState === "error" ? "var(--danger)" : "var(--text-muted)" }}>
          {saveHint}
        </div>
      ) : null}

      <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border)" }}>
        <Button variant="solid" size="sm" onClick={onDelete}>
          Delete {label.toLowerCase()}
        </Button>
      </div>
    </div>
  );
}

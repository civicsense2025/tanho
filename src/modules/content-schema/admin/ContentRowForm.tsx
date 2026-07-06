"use client";

import { useState, useTransition } from "react";
import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/core/Button";
import { descriptorsFromFieldDefs } from "@/modules/custom-types/admin/descriptors";
import type { FieldDef } from "@/modules/custom-types/validation";
import { FieldControl } from "@/modules/entries/admin/fields";
import { createRow, updateRowData } from "../row-actions";
import styles from "./content-rows.module.css";

/** Lowercase, spaces→dashes, strip anything outside [a-z0-9-]. Mirrors entries' slugify. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

/**
 * Create/edit one ROW of a table-backed content type. A near-clone of
 * entries/admin/EntryForm's data half (reusing FieldControl +
 * descriptorsFromFieldDefs), but writing to the type's real ct_* table via the
 * row-actions instead of the shared entries table — and with no per-row block
 * editor (a content type has ONE shared template, not per-row trees).
 *
 * Hidden fields are deliberately SHOWN here: the owner still edits internal
 * columns in the admin; `hidden` only suppresses public render/search.
 */
export function ContentRowForm({
  typeId,
  fields,
  initial,
  onDone,
  onCancel,
}: {
  typeId: string;
  fields: FieldDef[];
  /** The existing row (edit) or undefined (create). Keyed by column name. */
  initial?: Record<string, unknown>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const descriptors = descriptorsFromFieldDefs(fields);
  const isEdit = Boolean(initial);

  const [title, setTitle] = useState(String(initial?.title ?? ""));
  const [slug, setSlug] = useState(String(initial?.slug ?? ""));
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [status, setStatus] = useState<"draft" | "published">(
    initial?.status === "published" ? "published" : "draft",
  );
  const [data, setData] = useState<Record<string, unknown>>(() => {
    const out: Record<string, unknown> = {};
    for (const d of descriptors) out[d.key] = initial?.[d.key];
    return out;
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const setTitleAndMaybeSlug = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };
  const setField = (key: string, value: unknown) => setData((p) => ({ ...p, [key]: value }));

  const save = () => {
    setError(null);
    const input = { title, slug, status, ...data };
    startTransition(async () => {
      const res = isEdit
        ? await updateRowData(typeId, String(initial!.id), input)
        : await createRow(typeId, input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onDone();
    });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>{isEdit ? "Edit row" : "New row"}</h2>
        <span style={{ flex: 1 }} />
        {error ? <span className={styles.error}>{error}</span> : null}
      </div>

      <div className={styles.grid}>
        <Field label="Title" style={{ gridColumn: "1 / -1" }}>
          <Input value={title} onChange={(e) => setTitleAndMaybeSlug(e.target.value)} placeholder="Untitled" />
        </Field>

        <Field label="Slug" hint="The per-row URL segment">
          <Input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
          />
        </Field>

        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </Select>
        </Field>

        {descriptors.map((d) => (
          <div key={d.key} className={d.kind === "textarea" || d.kind === "tags" ? styles.full : undefined}>
            <FieldControl descriptor={d} value={data[d.key]} onChange={(v) => setField(d.key, v)} />
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <Button variant="accent" size="sm" onClick={save} loading={pending}>
          {isEdit ? "Save" : "Create"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

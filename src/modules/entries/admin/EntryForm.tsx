"use client";

import { useState, useTransition } from "react";
import type { EntryRow } from "@/modules/entries/schema";
import { createEntry, updateEntry } from "@/modules/entries/actions";
import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/core/Button";
import { descriptorsFromFieldDefs } from "@/modules/custom-types/admin/descriptors";
import type { FieldDef } from "@/modules/custom-types/validation";
import { FIELD_DESCRIPTORS, FieldControl, type FieldDescriptor } from "./fields";
import styles from "./entry-form.module.css";

/** Lowercase, spaces→dashes, strip anything outside [a-z0-9-]. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

/** Seed a data record from descriptors, overlaying any existing entry data. */
function seedData(
  descriptors: FieldDescriptor[],
  existing: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const d of descriptors) {
    const cur = existing?.[d.key];
    if (cur !== undefined) {
      out[d.key] = cur;
    } else if (d.kind === "tags") {
      out[d.key] = [];
    } else if (d.kind === "number") {
      out[d.key] = 0;
    } else if (d.kind === "boolean") {
      out[d.key] = d.key === "is_public";
    } else if (d.kind === "select") {
      out[d.key] = d.options?.[0]?.[0] ?? "";
    } else {
      out[d.key] = "";
    }
  }
  return out;
}

/**
 * Schema-driven create/edit form for one entry. Title + Slug + Status are
 * fixed; the remaining fields come from FIELD_DESCRIPTORS for the entity.
 * All writes go through the zod-validated server actions.
 */
export function EntryForm({
  entity,
  customFields,
  initial,
  onDone,
  onCancel,
}: {
  entity: string;
  /** For `custom:<slug>` types: the type's own field list, since built-ins have no entry in FIELD_DESCRIPTORS to fall back from. */
  customFields?: FieldDef[];
  initial?: EntryRow;
  onDone: () => void;
  onCancel: () => void;
}) {
  const descriptors =
    FIELD_DESCRIPTORS[entity] ?? (customFields ? descriptorsFromFieldDefs(customFields) : []);
  const isEdit = Boolean(initial);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [status, setStatus] = useState<"draft" | "published">(
    initial?.status ?? "draft",
  );
  const [data, setData] = useState<Record<string, unknown>>(() =>
    seedData(descriptors, initial?.data),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const setTitleAndMaybeSlug = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const setField = (key: string, value: unknown) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const save = () => {
    setError(null);
    const input = { type: entity, slug, title, status, data };
    startTransition(async () => {
      const res = isEdit
        ? await updateEntry(initial!.id, input)
        : await createEntry(input);
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
        <h2 className={styles.panelTitle}>
          {isEdit ? "Edit entry" : "New entry"}
        </h2>
        <span style={{ flex: 1 }} />
        {error ? <span className={styles.error}>{error}</span> : null}
      </div>

      <div className={styles.grid}>
        <Field label="Title" style={{ gridColumn: "1 / -1" }}>
          <Input
            value={title}
            onChange={(e) => setTitleAndMaybeSlug(e.target.value)}
            placeholder="Untitled"
          />
        </Field>

        <Field label="Slug">
          <Input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
          />
        </Field>

        <Field label="Status">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "published")}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </Select>
        </Field>

        {descriptors.map((d) => (
          <div
            key={d.key}
            className={
              d.kind === "textarea" || d.kind === "tags" ? styles.full : undefined
            }
          >
            <FieldControl
              descriptor={d}
              value={data[d.key]}
              onChange={(v) => setField(d.key, v)}
            />
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
        <span style={{ flex: 1 }} />
        <span className={styles.note}>
          Page content blocks are edited in the page editor.
        </span>
      </div>
    </div>
  );
}

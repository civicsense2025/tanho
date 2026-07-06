"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTableBackedType } from "@/modules/content-schema/actions";
import type { FieldDef } from "../validation";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";
import { FieldRow } from "./FieldRow";
import { DataTypeMeta, type DataTypeMetaValue } from "./DataTypeMeta";
import { slugify } from "./slug";
import styles from "./types.module.css";

const emptyField = (): FieldDef => ({ key: "", label: "", kind: "text" });

/**
 * Create a **data-backed** content type — one provisioned as a real `ct_<slug>`
 * table (one typed column per field), as opposed to the legacy JSON-backed
 * types the sibling CreateTypeForm makes. Collapsed to a single button until
 * opened; on submit it calls `createTableBackedType`, which runs the CREATE
 * TABLE + writes the metadata row. The new type starts as a draft with no base
 * path — the owner sets those and publishes from its card afterwards.
 */
export function CreateDataTypeForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [meta, setMeta] = useState<DataTypeMetaValue>({
    pluralName: "",
    basePath: "",
    titleField: "title",
    slugField: "slug",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const slug = slugify(name);

  const setField = (i: number, next: FieldDef) => {
    const copy = [...fields];
    copy[i] = next;
    setFields(copy);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    const copy = [...fields];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setFields(copy);
  };

  const reset = () => {
    setName("");
    setFields([]);
    setMeta({ pluralName: "", basePath: "", titleField: "title", slugField: "slug" });
    setError(null);
    setOpen(false);
  };

  const create = () =>
    startTransition(async () => {
      const res = await createTableBackedType({
        slug,
        name,
        pluralName: meta.pluralName || undefined,
        fields,
        titleField: meta.titleField,
        slugField: meta.slugField,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Base path is metadata-only; set it after the table exists so its route
      // guard runs against the just-created type.
      if (meta.basePath.trim()) {
        const { setTableBackedBasePath } = await import("./table-type-actions");
        const baseRes = await setTableBackedBasePath(res.data!.id, meta.basePath);
        if (!baseRes.ok) {
          // The type was created; only the base failed. Surface it but don't
          // block — the owner can fix the base from the new card.
          setError(`Type created, but base path was not set: ${baseRes.error}`);
        }
      }
      reset();
      router.refresh();
    });

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        New data-backed type
      </Button>
    );
  }

  return (
    <div className={styles.typeCard}>
      <div className={styles.disclosureHead}>
        <strong style={{ fontSize: "var(--text-sm)" }}>New data-backed type</strong>
        <span className={styles.badge}>Data-backed</span>
        <span style={{ flex: 1 }} />
        {slug ? <span className={styles.slug}>ct_{slug.replace(/-/g, "_")}</span> : null}
      </div>

      <p className={styles.hint}>
        Creates a real database table — one typed column per field — that you can
        list, filter, and publish as its own set of pages.
      </p>

      <div className={styles.metaField}>
        <span className={styles.metaLabel}>Name</span>
        <Input
          placeholder="e.g. Product"
          value={name}
          invalid={!!error}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
        />
      </div>

      <DataTypeMeta value={meta} fields={fields} onChange={setMeta} />

      <div className={styles.fields}>
        {fields.map((f, i) => (
          <FieldRow
            key={i}
            field={f}
            depth={0}
            onChange={(next) => setField(i, next)}
            onRemove={() => setFields(fields.filter((_, j) => j !== i))}
            onMove={(dir) => move(i, dir)}
          />
        ))}
      </div>

      <div className={styles.actions}>
        <Button variant="outline" size="sm" onClick={() => setFields([...fields, emptyField()])}>
          Add field
        </Button>
        <span style={{ flex: 1 }} />
        {error ? <span className={styles.error}>{error}</span> : null}
        <Button variant="ghost" size="sm" onClick={reset} disabled={pending}>
          Cancel
        </Button>
        <Button variant="accent" size="sm" onClick={create} loading={pending} disabled={!slug}>
          Create table
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { listImportableTables, registerExistingTable } from "@/modules/content-schema/actions";
import { type TableCandidate } from "@/modules/content-schema/introspect";
import type { FieldDef, FieldKind } from "../validation";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/core/Button";
import { DataTypeMeta, type DataTypeMetaValue } from "./DataTypeMeta";
import styles from "./types.module.css";

/**
 * Import-from-DB tool. Lists all tables in the platform's own DATABASE_URL
 * that aren't already registered as content types and aren't platform system
 * tables. The owner picks a table, reviews the auto-detected field mapping
 * (with recommendations), confirms, and the table is registered as a content
 * type — no schema typing, no SQL. Missing spine columns are ALTERed in
 * automatically.
 */
export function ImportTablePicker() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, startLoad] = useTransition();
  const [tables, setTables] = useState<TableCandidate[]>([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<TableCandidate | null>(null);
  const [name, setName] = useState("");
  const [fieldDefs, setFieldDefs] = useState<FieldDef[]>([]);
  const [meta, setMeta] = useState<DataTypeMetaValue>({
    pluralName: "",
    basePath: "",
    titleField: "title",
    slugField: "slug",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = () =>
    startLoad(async () => {
      const res = await listImportableTables();
      if (res.ok) setTables(res.data!.tables);
      else setError(res.error);
    });

  const pickTable = (t: TableCandidate) => {
    setSelected(t);
    setName(t.tableName.replace(/^ct_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
    setFieldDefs(
      t.fieldColumns.map((fc) => ({
        key: fc.column.name,
        label: fc.column.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        kind: fc.inferredKind,
      })),
    );
    setMeta({
      pluralName: "",
      basePath: "",
      titleField: t.spineColumns.includes("title") ? "title" : (t.fieldColumns[0]?.column.name ?? "title"),
      slugField: t.spineColumns.includes("slug") ? "slug" : (t.fieldColumns.find((f) => f.column.name.includes("slug"))?.column.name ?? "slug"),
    });
  };

  const setFieldKind = (i: number, kind: FieldKind) => {
    const copy = [...fieldDefs];
    copy[i] = { ...copy[i], kind };
    setFieldDefs(copy);
  };

  const setFieldLabel = (i: number, label: string) => {
    const copy = [...fieldDefs];
    copy[i] = { ...copy[i], label };
    setFieldDefs(copy);
  };

  const reset = () => {
    setSelected(null);
    setName("");
    setFieldDefs([]);
    setMeta({ pluralName: "", basePath: "", titleField: "title", slugField: "slug" });
    setError(null);
  };

  const close = () => {
    reset();
    setTables([]);
    setFilter("");
    setOpen(false);
  };

  const register = () =>
    startTransition(async () => {
      const res = await registerExistingTable({
        tableName: selected!.tableName,
        name,
        pluralName: meta.pluralName || undefined,
        basePath: meta.basePath || undefined,
        titleField: meta.titleField,
        slugField: meta.slugField,
        fields: fieldDefs,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      close();
      router.refresh();
    });

  const filtered = tables.filter((t) =>
    t.tableName.toLowerCase().includes(filter.toLowerCase()),
  );

  // Recommendations for the selected table
  const recommendations: string[] = [];
  if (selected) {
    if (selected.spineColumns.length < 9) {
      recommendations.push(
        `This table is missing ${9 - selected.spineColumns.length} spine columns (id, slug, title, etc.). They'll be added automatically on import.`,
      );
    }
    const titleCol = selected.fieldColumns.find((f) => f.column.name === "title" || f.column.name === "name");
    if (titleCol) {
      recommendations.push(`Column "${titleCol.column.name}" looks like a good title field.`);
    }
    const slugCol = selected.fieldColumns.find((f) => f.column.name === "slug");
    if (slugCol) {
      recommendations.push(`Column "slug" detected — recommended as the URL slug field.`);
    }
    const boolCols = selected.fieldColumns.filter((f) => f.inferredKind === "boolean");
    if (boolCols.length > 0) {
      recommendations.push(`${boolCols.length} boolean column(s) detected — they'll become toggle fields.`);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => { setOpen(true); load(); }}>
        Import from DB
      </Button>
    );
  }

  return (
    <div className={styles.typeCard}>
      <div className={styles.disclosureHead}>
        <strong style={{ fontSize: "var(--text-sm)" }}>Import a table from your database</strong>
        <span style={{ flex: 1 }} />
        <Button variant="ghost" size="sm" onClick={close}>Close</Button>
      </div>

      {!selected ? (
        <>
          <p className={styles.hint}>
            Tables in your database that aren&apos;t already registered as content types.
            Pick one to auto-detect its columns and create a content type.
          </p>

          {loading ? (
            <p className={styles.hint}>Loading tables...</p>
          ) : tables.length === 0 ? (
            <p className={styles.hint}>
              No importable tables found. All tables in your database are either
              already registered or are platform system tables.
            </p>
          ) : (
            <>
              <Input
                placeholder="Filter tables..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <div className={styles.tableList}>
                {filtered.map((t) => (
                  <button
                    key={t.tableName}
                    className={styles.tableRow}
                    onClick={() => pickTable(t)}
                  >
                    <span className={styles.tableName}>{t.tableName}</span>
                    <span className={styles.hint}>
                      {t.fieldColumns.length} field column{t.fieldColumns.length === 1 ? "" : "s"}
                      {t.spineColumns.length > 0 ? ` · ${t.spineColumns.length} spine` : ""}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
          {error ? <span className={styles.error}>{error}</span> : null}
        </>
      ) : (
        <>
          <div className={styles.disclosureHead}>
            <span className={styles.tableName}>{selected.tableName}</span>
            <span className={styles.badge}>Existing table</span>
            <span style={{ flex: 1 }} />
            <Button variant="ghost" size="sm" onClick={reset}>Back to list</Button>
          </div>

          {recommendations.length > 0 ? (
            <div className={styles.recommendations}>
              {recommendations.map((r, i) => (
                <p key={i} className={styles.hint}>{r}</p>
              ))}
            </div>
          ) : null}

          {selected.spineColumns.length > 0 ? (
            <div className={styles.spineInfo}>
              <span className={styles.metaLabel}>System columns detected</span>
              <span className={styles.hint}>{selected.spineColumns.join(", ")}</span>
            </div>
          ) : null}

          <div className={styles.metaField}>
            <span className={styles.metaLabel}>Content type name</span>
            <Input
              placeholder="e.g. Customer Reviews"
              value={name}
              invalid={!!error}
              onChange={(e) => { setName(e.target.value); setError(null); }}
            />
          </div>

          <DataTypeMeta value={meta} fields={fieldDefs} onChange={setMeta} />

          <div className={styles.fields}>
            <span className={styles.metaLabel}>Field mapping ({fieldDefs.length})</span>
            {fieldDefs.map((f, i) => (
              <div key={i} className={styles.fieldRow}>
                <span className={styles.tableName} style={{ minWidth: "120px" }}>{f.key}</span>
                <Input
                  className={styles.grow}
                  value={f.label}
                  onChange={(e) => setFieldLabel(i, e.target.value)}
                />
                <select
                  className={styles.kindSelect}
                  value={f.kind}
                  onChange={(e) => setFieldKind(i, e.target.value as FieldKind)}
                >
                  <option value="text">Text</option>
                  <option value="richtext">Rich text</option>
                  <option value="number">Number</option>
                  <option value="currency">Currency</option>
                  <option value="boolean">Boolean</option>
                  <option value="date">Date</option>
                  <option value="select">Select</option>
                  <option value="tags">Tags</option>
                  <option value="url">URL</option>
                  <option value="email">Email</option>
                  <option value="color">Color</option>
                  <option value="file">File</option>
                  <option value="image">Image</option>
                  <option value="reference">Reference</option>
                  <option value="json">JSON</option>
                  <option value="repeater">Repeater</option>
                </select>
              </div>
            ))}
          </div>

          <div className={styles.actions}>
            <span style={{ flex: 1 }} />
            {error ? <span className={styles.error}>{error}</span> : null}
            <Button variant="ghost" size="sm" onClick={close} disabled={pending}>Cancel</Button>
            <Button variant="accent" size="sm" onClick={register} loading={pending} disabled={!name}>
              Register content type
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import type { FieldDef } from "../validation";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import styles from "./types.module.css";

/** The metadata a table-backed type carries beyond its fields. */
export type DataTypeMetaValue = {
  pluralName: string;
  basePath: string;
  titleField: string;
  slugField: string;
};

/**
 * The shared meta controls for a table-backed content type — plural label,
 * public base path, and the title/slug field pickers. The pickers list the
 * type's own field keys plus the built-in `title`/`slug` spine columns (every
 * ct_* table has those), defaulting to that spine. Used by both the create
 * form and the per-type editor card so they stay identical.
 */
export function DataTypeMeta({
  value,
  fields,
  onChange,
  showBasePath = true,
}: {
  value: DataTypeMetaValue;
  fields: FieldDef[];
  onChange: (next: DataTypeMetaValue) => void;
  showBasePath?: boolean;
}) {
  const set = (patch: Partial<DataTypeMetaValue>) => onChange({ ...value, ...patch });

  // The spine columns are real columns too, so they're valid title/slug picks.
  const keys = ["title", "slug", ...fields.map((f) => f.key).filter(Boolean)];
  const options = Array.from(new Set(keys));

  return (
    <div className={styles.metaGrid}>
      <label className={styles.metaField}>
        <span className={styles.metaLabel}>Plural name</span>
        <Input
          placeholder="e.g. Products"
          value={value.pluralName}
          onChange={(e) => set({ pluralName: e.target.value })}
        />
      </label>

      {showBasePath ? (
        <label className={styles.metaField}>
          <span className={styles.metaLabel}>Base path</span>
          <Input
            placeholder="/products"
            value={value.basePath}
            onChange={(e) => set({ basePath: e.target.value })}
          />
        </label>
      ) : null}

      <label className={styles.metaField}>
        <span className={styles.metaLabel}>Title field</span>
        <Select value={value.titleField} onChange={(e) => set({ titleField: e.target.value })}>
          {options.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </Select>
      </label>

      <label className={styles.metaField}>
        <span className={styles.metaLabel}>Slug field</span>
        <Select value={value.slugField} onChange={(e) => set({ slugField: e.target.value })}>
          {options.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}

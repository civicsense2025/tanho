"use client";

import { FIELD_KINDS, type FieldDef, type FieldKind } from "../validation";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/core/Button";
import styles from "./types.module.css";

const emptyField = (): FieldDef => ({ key: "", label: "", kind: "text" });

/**
 * One editable field definition, recursive for repeaters. `depth` caps
 * nesting at 3 levels (matching the meta-schema) — deeper repeaters can't
 * add children.
 */
export function FieldRow({
  field,
  depth,
  onChange,
  onRemove,
  onMove,
}: {
  field: FieldDef;
  depth: number;
  onChange: (next: FieldDef) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const set = (patch: Partial<FieldDef>) => onChange({ ...field, ...patch });

  const setChild = (i: number, next: FieldDef) => {
    const fields = [...(field.fields ?? [])];
    fields[i] = next;
    set({ fields });
  };
  const removeChild = (i: number) =>
    set({ fields: (field.fields ?? []).filter((_, j) => j !== i) });
  const moveChild = (i: number, dir: -1 | 1) => {
    const fields = [...(field.fields ?? [])];
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    [fields[i], fields[j]] = [fields[j], fields[i]];
    set({ fields });
  };
  const addChild = () => set({ fields: [...(field.fields ?? []), emptyField()] });

  return (
    <div className={styles.fieldRow}>
      <Input
        className={styles.grow}
        placeholder="key"
        value={field.key}
        onChange={(e) => set({ key: e.target.value })}
      />
      <Input
        className={styles.grow}
        placeholder="Label"
        value={field.label}
        onChange={(e) => set({ label: e.target.value })}
      />
      <Select
        value={field.kind}
        onChange={(e) => set({ kind: e.target.value as FieldKind })}
      >
        {FIELD_KINDS.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </Select>

      {field.kind === "select" ? (
        <Input
          className={styles.grow}
          placeholder="options, comma-separated"
          value={(field.options ?? []).join(", ")}
          onChange={(e) =>
            set({
              options: e.target.value
                .split(",")
                .map((o) => o.trim())
                .filter(Boolean),
            })
          }
        />
      ) : null}

      {field.kind === "reference" ? (
        <>
          <Input
            placeholder="refType"
            value={field.refType ?? ""}
            onChange={(e) => set({ refType: e.target.value })}
          />
          <label style={{ fontSize: "var(--text-xs)", display: "inline-flex", gap: 4 }}>
            <input
              type="checkbox"
              checked={!!field.multi}
              onChange={(e) => set({ multi: e.target.checked })}
            />
            multi
          </label>
        </>
      ) : null}

      <label style={{ fontSize: "var(--text-xs)", display: "inline-flex", gap: 4 }}>
        <input
          type="checkbox"
          checked={!!field.required}
          onChange={(e) => set({ required: e.target.checked })}
        />
        req
      </label>

      <div className={styles.rowBtns}>
        <Button variant="ghost" size="sm" onClick={() => onMove(-1)}>
          ↑
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onMove(1)}>
          ↓
        </Button>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          ✕
        </Button>
      </div>

      {field.kind === "repeater" ? (
        <div className={styles.nested} style={{ flexBasis: "100%" }}>
          {(field.fields ?? []).map((child, i) => (
            <FieldRow
              key={i}
              field={child}
              depth={depth + 1}
              onChange={(next) => setChild(i, next)}
              onRemove={() => removeChild(i)}
              onMove={(dir) => moveChild(i, dir)}
            />
          ))}
          {depth < 2 ? (
            <div>
              <Button variant="outline" size="sm" onClick={addChild}>
                Add nested field
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { Input } from "@/components/forms/Input";
import { Field } from "@/components/forms/Field";
import { Toggle } from "@/components/admin/Seg";
import { hasOptions, isScreen, kindLabel } from "../field-kinds";
import type { FormField } from "../validation";
import styles from "./forms.module.css";

/** Per-field settings card in the Build tab. */
export function FieldEditor({
  field,
  isQuiz,
  onChange,
  onRemove,
  onMove,
}: {
  field: FormField;
  isQuiz: boolean;
  onChange: (p: Partial<FormField>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const screen = isScreen(field.kind);
  const options = hasOptions(field.kind);
  const payment = field.kind === "payment";

  return (
    <div className={styles.fieldCard}>
      <div className={styles.fieldHead}>
        <span className={styles.kindPill}>{kindLabel(field.kind)}</span>
        <span style={{ flex: 1 }} />
        <button type="button" className={styles.iconBtn} aria-label="Move up" onClick={() => onMove(-1)}>
          ▴
        </button>
        <button type="button" className={styles.iconBtn} aria-label="Move down" onClick={() => onMove(1)}>
          ▾
        </button>
        <button type="button" className={styles.iconBtn} aria-label="Remove" onClick={onRemove}>
          ✕
        </button>
      </div>

      <Field label={screen ? "Title" : "Label"}>
        <Input value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
      </Field>

      <Field label={screen ? "Body" : "Help text"}>
        <Input value={field.help} onChange={(e) => onChange({ help: e.target.value })} />
      </Field>

      {!screen ? (
        <Field label="Placeholder">
          <Input
            value={field.placeholder}
            onChange={(e) => onChange({ placeholder: e.target.value })}
          />
        </Field>
      ) : null}

      {payment ? (
        <Field label="Amount (USD)">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={field.amountCents / 100}
            onChange={(e) =>
              onChange({ amountCents: Math.round((Number(e.target.value) || 0) * 100) })
            }
          />
        </Field>
      ) : null}

      {options ? (
        <Field label="Options (one per line)">
          <textarea
            className={styles.optionsArea}
            value={field.options.map((o) => o.label).join("\n")}
            onChange={(e) =>
              onChange({
                options: e.target.value
                  .split("\n")
                  .filter((l) => l.trim())
                  .map((label) => ({
                    label: label.trim(),
                    value: label.trim().toLowerCase().replace(/\s+/g, "-"),
                  })),
              })
            }
          />
        </Field>
      ) : null}

      {!screen ? (
        <div className={styles.fieldFooter}>
          <label className={styles.inlineToggle}>
            Required
            <Toggle value={field.required} onChange={(v) => onChange({ required: v })} />
          </label>
          {isQuiz && options ? (
            <Field label="Points">
              <Input
                type="number"
                value={field.points}
                min={0}
                onChange={(e) => onChange({ points: Number(e.target.value) || 0 })}
                className={styles.miniNum}
              />
            </Field>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

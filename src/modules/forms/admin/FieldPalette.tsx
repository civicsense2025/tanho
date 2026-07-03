"use client";

import { FIELD_CATEGORIES, FIELD_KINDS, type FieldKind } from "../field-kinds";
import styles from "./forms.module.css";

/** The add-field palette, grouped by category (the six FIELD_CATEGORIES). */
export function FieldPalette({ onAdd }: { onAdd: (kind: FieldKind) => void }) {
  return (
    <div className={styles.palette}>
      {FIELD_CATEGORIES.map((cat) => (
        <div key={cat} className={styles.paletteGroup}>
          <h3 className={styles.paletteHead}>{cat}</h3>
          <div className={styles.paletteGrid}>
            {FIELD_KINDS.filter((k) => k.category === cat).map((k) => (
              <button
                key={k.id}
                type="button"
                className={styles.paletteBtn}
                onClick={() => onAdd(k.id)}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/core/Button";
import styles from "./profile.module.css";

/**
 * The repeater editor primitive: a titled section whose rows are bordered
 * cards with a Remove control, plus a "+ Add row" button underneath. Each
 * `row` is rendered by the caller's `renderRow`.
 */
export function Repeater<T>({
  title,
  rows,
  onChange,
  blank,
  renderRow,
  addLabel = "Add row",
}: {
  title: string;
  rows: T[];
  onChange: (rows: T[]) => void;
  blank: () => T;
  renderRow: (row: T, update: (patch: Partial<T>) => void) => ReactNode;
  addLabel?: string;
}) {
  const updateAt = (i: number, patch: Partial<T>) => {
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };
  const removeAt = (i: number) => onChange(rows.filter((_, j) => j !== i));

  return (
    <section className={styles.repeater}>
      <h2 className={styles.repeaterHead}>{title}</h2>
      <div className={styles.rows}>
        {rows.map((row, i) => (
          <div key={i} className={styles.card}>
            <div className={styles.cardBody}>{renderRow(row, (patch) => updateAt(i, patch))}</div>
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => removeAt(i)}
              aria-label="Remove row"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div>
        <Button variant="outline" size="sm" onClick={() => onChange([...rows, blank()])}>
          + {addLabel}
        </Button>
      </div>
    </section>
  );
}

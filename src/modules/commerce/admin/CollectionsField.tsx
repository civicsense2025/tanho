"use client";

import styles from "./commerce.module.css";

export type CollectionOption = { id: string; name: string };

/** Multi-select collection chips — toggling updates the selected id set. */
export function CollectionsField({
  options,
  selected,
  onChange,
}: {
  options: CollectionOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  if (options.length === 0) {
    return <span className={styles.faint}>No collections yet.</span>;
  }
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <div className={styles.chips}>
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            className={`${styles.chip} ${on ? styles.chipActive : ""}`}
            aria-pressed={on}
            onClick={() => toggle(o.id)}
          >
            {on ? "✓ " : ""}
            {o.name}
          </button>
        );
      })}
    </div>
  );
}

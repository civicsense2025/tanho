import styles from "./commerce.module.css";

export type SetupChecklistItem = {
  label: string;
  done: boolean;
};

/**
 * Store setup checklist — shown atop the store admin screens until every
 * step is done, then auto-hides. Done-states are resolved server-side and
 * passed in as plain booleans (no client-side adapter imports).
 */
export function SetupChecklist({ items }: { items: SetupChecklistItem[] }) {
  const done = items.filter((i) => i.done).length;
  if (done === items.length) return null;

  return (
    <div className={styles.setupChecklist}>
      <span className={styles.cardHead}>
        Store setup — {done}/{items.length}
      </span>
      <div className={styles.setupList}>
        {items.map((it) => (
          <div key={it.label} className={styles.setupRow}>
            <span
              className={styles.setupDot}
              data-done={it.done || undefined}
              aria-hidden
            >
              {it.done ? "✓" : ""}
            </span>
            <span className={styles.setupLabel} data-done={it.done || undefined}>
              {it.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import styles from "./chrome.module.css";

/** Bordered settings card with an uppercase mono heading. */
export function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionHead}>{title}</h2>
      {desc ? <p className={styles.sectionDesc}>{desc}</p> : null}
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

/** Label + 300px control grid row (stack for full-width controls). */
export function Row({
  label,
  stack = false,
  children,
}: {
  label: ReactNode;
  stack?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={stack ? styles.rowStack : styles.row}>
      <span
        className={styles.rowLabel}
        style={stack ? { marginBottom: "var(--space-2)", display: "inline-flex" } : undefined}
      >
        {label}
      </span>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

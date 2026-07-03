import type { HTMLAttributes, ReactNode } from "react";
import styles from "./controls.module.css";

type FieldProps = HTMLAttributes<HTMLDivElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
};

/** Field — uppercase mono micro-label above a control, optional hint below. */
export function Field({ label, hint, children, style, ...props }: FieldProps) {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "6px", ...style }}
      {...props}
    >
      {label ? <label className={styles.fieldLabel}>{label}</label> : null}
      {children}
      {hint ? <span className={styles.fieldHint}>{hint}</span> : null}
    </div>
  );
}

import type { ReactNode, SelectHTMLAttributes } from "react";
import styles from "./controls.module.css";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode;
  invalid?: boolean;
};

/** Select — native dropdown styled to match Input, with a quiet chevron. */
export function Select({ children, invalid = false, className, ...props }: SelectProps) {
  return (
    <div className={styles.selectWrap}>
      <select
        className={[styles.control, styles.select, className ?? ""]
          .filter(Boolean)
          .join(" ")}
        aria-invalid={invalid || undefined}
        {...props}
      >
        {children}
      </select>
      <span aria-hidden className={styles.chevron}>
        ▾
      </span>
    </div>
  );
}

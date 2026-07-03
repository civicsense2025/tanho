import type { InputHTMLAttributes } from "react";
import styles from "./controls.module.css";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

/** Input — single-line text field on a subtle surface. */
export function Input({ invalid = false, className, ...props }: InputProps) {
  return (
    <input
      className={[styles.control, className ?? ""].filter(Boolean).join(" ")}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

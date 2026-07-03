import type { TextareaHTMLAttributes } from "react";
import styles from "./controls.module.css";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

/** Textarea — multi-line variant of Input. */
export function Textarea({ invalid = false, className, ...props }: TextareaProps) {
  return (
    <textarea
      className={[styles.control, styles.textarea, className ?? ""]
        .filter(Boolean)
        .join(" ")}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

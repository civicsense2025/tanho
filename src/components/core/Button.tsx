import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "solid" | "accent" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  /** Outline buttons default to the uppercase mono label. */
  uppercase?: boolean;
  loading?: boolean;
};

/**
 * Button — the system's primary action. Three quiet variants: solid (ink
 * fill), accent, outline (hairline + mono label), ghost (text only).
 */
export function Button({
  children,
  variant = "solid",
  size = "md",
  uppercase,
  loading = false,
  className,
  type,
  ...props
}: ButtonProps) {
  const isUpper = uppercase ?? variant === "outline";
  const cls = [
    styles.btn,
    styles[size],
    styles[variant],
    isUpper ? styles.upper : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type={type ?? "button"}
      className={cls}
      data-loading={loading || undefined}
      disabled={props.disabled || loading}
      {...props}
    >
      {children}
    </button>
  );
}

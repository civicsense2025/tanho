"use client";

import { useState, type CSSProperties } from "react";

/** Input — single-line field. Subtle surface, hairline border that warms on focus. */
export function Input({
  invalid = false,
  style,
  onFocus,
  onBlur,
  ...props
}: { invalid?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      onFocus={(e) => {
        setFocus(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocus(false);
        onBlur?.(e);
      }}
      style={{
        width: "100%",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
        color: "var(--text)",
        background: "var(--surface)",
        border: "1px solid",
        borderColor: invalid ? "var(--accent)" : focus ? "var(--text-muted)" : "var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: "9px 12px",
        outline: "none",
        boxShadow: focus ? "var(--shadow-focus)" : "none",
        transition: "var(--transition), box-shadow var(--dur) var(--ease)",
        ...(style as CSSProperties),
      }}
      {...props}
    />
  );
}

"use client";

import { useState, type CSSProperties } from "react";

/** Select — native dropdown styled to match Input, with a quiet chevron. */
export function Select({
  children,
  invalid = false,
  style,
  onFocus,
  onBlur,
  ...props
}: { invalid?: boolean } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <select
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
          appearance: "none",
          WebkitAppearance: "none",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          color: "var(--text)",
          background: "var(--surface)",
          border: "1px solid",
          borderColor: invalid ? "var(--accent)" : focus ? "var(--text-muted)" : "var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "9px 34px 9px 12px",
          outline: "none",
          cursor: "pointer",
          boxShadow: focus ? "var(--shadow-focus)" : "none",
          transition: "var(--transition), box-shadow var(--dur) var(--ease)",
          ...(style as CSSProperties),
        }}
        {...props}
      >
        {children}
      </select>
      <span
        aria-hidden
        style={{
          position: "absolute",
          right: "12px",
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: "var(--text-faint)",
          fontSize: "10px",
        }}
      >
        ▾
      </span>
    </div>
  );
}

"use client";

import { useState, type CSSProperties } from "react";

/** Textarea — multi-line field. `mono` switches to Geist Mono for HTML/code entry. */
export function Textarea({
  invalid = false,
  mono = false,
  rows = 4,
  style,
  onFocus,
  onBlur,
  ...props
}: { invalid?: boolean; mono?: boolean } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focus, setFocus] = useState(false);
  return (
    <textarea
      rows={rows}
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
        fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
        fontSize: mono ? "var(--text-xs)" : "var(--text-sm)",
        lineHeight: "var(--leading-normal)",
        color: "var(--text)",
        background: "var(--surface)",
        border: "1px solid",
        borderColor: invalid ? "var(--accent)" : focus ? "var(--text-muted)" : "var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: "10px 12px",
        outline: "none",
        resize: "vertical",
        boxShadow: focus ? "var(--shadow-focus)" : "none",
        transition: "var(--transition), box-shadow var(--dur) var(--ease)",
        ...(style as CSSProperties),
      }}
      {...props}
    />
  );
}

import type { CSSProperties, ReactNode } from "react";

/** Field — label + control wrapper with an uppercase mono micro-label. */
export function Field({
  label,
  hint,
  children,
  style,
}: {
  label?: string;
  hint?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", ...style }}>
      {label && (
        <label
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "var(--text-2xs)",
            textTransform: "uppercase",
            letterSpacing: "var(--tracking-wide)",
            color: "var(--text-muted)",
          }}
        >
          {label}
        </label>
      )}
      {children}
      {hint && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{hint}</span>}
    </div>
  );
}

import type { ReactNode } from "react";

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        margin: "0 0 var(--space-8)",
        fontFamily: "var(--font-label)",
        fontSize: "var(--text-xs)",
        textTransform: "uppercase",
        letterSpacing: "var(--tracking-widest)",
        color: "var(--text-muted)",
      }}
    >
      {children}
    </h2>
  );
}

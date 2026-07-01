import type { ReactNode } from "react";

// résumé row: mono span on the left, content on the right
export function Row({ span, children, last }: { span: ReactNode; children: ReactNode; last?: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "9rem 1fr",
        gap: "var(--space-5)",
        padding: "var(--space-5) 0",
        borderBottom: last ? "none" : "1px solid var(--border)",
      }}
    >
      <span style={{ fontFamily: "var(--font-label)", fontSize: "var(--text-xs)", color: "var(--text-faint)", paddingTop: "2px" }}>{span}</span>
      <div>{children}</div>
    </div>
  );
}

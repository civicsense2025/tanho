import type { ReactNode } from "react";

/** Bordered live-preview shell used by the chrome admin screens. */
export function PreviewFrame({ label = "Live preview", children }: { label?: string; children: ReactNode }) {
  return (
    <div>
      <span
        style={{
          fontFamily: "var(--font-label)",
          fontSize: "var(--text-2xs)",
          textTransform: "uppercase",
          letterSpacing: "var(--tracking-widest)",
          color: "var(--text-muted)",
        }}
      >
        {label}
      </span>
      <div
        style={{
          marginTop: "var(--space-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          overflow: "hidden",
          position: "relative",
          background: "var(--bg)",
          maxHeight: 460,
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

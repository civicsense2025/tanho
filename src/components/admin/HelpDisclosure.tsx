import type { ReactNode } from "react";

/**
 * Inline contextual help — native <details>/<summary> (same primitive
 * already used in editor/StyleFields.tsx), not a hover tooltip (bad on
 * touch) or a popover (no positioning/z-index system exists in this
 * codebase and none is needed here). Keyboard/screen-reader accessible
 * for free.
 */
export function HelpDisclosure({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      style={{ borderLeft: "2px solid transparent" }}
    >
      <summary
        style={{
          cursor: "pointer",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-1)",
        }}
      >
        <span aria-hidden>?</span>
        {label}
      </summary>
      <div
        style={{
          marginTop: "var(--space-2)",
          paddingLeft: "var(--space-3)",
          borderLeft: "2px solid var(--border)",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
        }}
      >
        {children}
      </div>
    </details>
  );
}

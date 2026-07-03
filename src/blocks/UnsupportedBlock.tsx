import type { CSSProperties } from "react";

/**
 * Placeholder shown when a block tree references a type this install doesn't
 * have (e.g. an imported pack uses a block type that isn't compiled in, or a
 * plugin isn't loaded). Used by the public walker (editor mode) and the client
 * editor canvas/preview/card so an unknown type never crashes a page — the
 * site stays up and the author can see exactly what's missing.
 *
 * Pure presentational component (no hooks) so it renders in both server and
 * client components.
 */
const STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-1)",
  padding: "var(--space-3)",
  border: "1px dashed var(--border)",
  borderRadius: "var(--radius-md)",
  background: "var(--surface-card)",
  color: "var(--text-muted)",
};

export function UnsupportedBlock({ type, compact = false }: { type: string; compact?: boolean }) {
  return (
    <div data-unsupported="true" style={STYLE}>
      <strong>Unsupported block</strong>
      {!compact ? (
        <span style={{ fontSize: "var(--text-xs)" }}>
          This block type ({type}) isn&apos;t available on this site. Install the matching block or remove it.
        </span>
      ) : (
        <span style={{ fontSize: "var(--text-xs)" }}>{type}</span>
      )}
    </div>
  );
}

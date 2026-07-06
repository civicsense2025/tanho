import type { CorrelationRow } from "../correlation";

/**
 * "Day-one correlation reveal" — an onboarding-style proof, not a pitch:
 * shows the creator their own data already converting readers into
 * customers. Renders nothing if there's no correlation yet (a brand-new
 * site with no history shouldn't show an empty "reveal").
 */
export function CorrelationCard({ rows }: { rows: CorrelationRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-5) var(--space-6)",
        marginBottom: "var(--space-6)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-label)",
          fontSize: "var(--text-2xs)",
          textTransform: "uppercase",
          letterSpacing: "var(--tracking-wide)",
          color: "var(--text-faint)",
          marginBottom: 10,
        }}
      >
        What&apos;s already converting
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.slice(0, 5).map((r) => (
          <li key={`${r.path}::${r.productName}`} style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>
            <strong>{r.personCount}</strong> {r.personCount === 1 ? "person" : "people"} read{" "}
            <code>{r.path}</code> then bought <strong>{r.productName}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

import type { CustomTypeRow } from "../schema";
import { CORE_TYPES } from "./type-catalog";
import { TypeToggleRow } from "./TypeToggleRow";
import { CreateTypeForm } from "./CreateTypeForm";
import { CreateDataTypeForm } from "./CreateDataTypeForm";
import { ImportTablePicker } from "./ImportTablePicker";
import { TypeCard } from "./TypeCard";
import { DataTypeCard } from "./DataTypeCard";

export type TypeCount = { total: number; live: number };

const eyebrowStyle = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--text-xs)",
  textTransform: "uppercase" as const,
  letterSpacing: "var(--tracking-widest)",
  color: "var(--text-muted)",
};
const boxStyle = { border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" };

/**
 * Content Types — two sections. "Built in" holds the core + commerce types
 * (Pages/Posts/Products/Collections) that live on dedicated tables with
 * specialized behaviour (SEO, Stripe, custom code). "Data-backed" holds every
 * type backed by a real `ct_*` table — the built-in structured types
 * (Projects/Guides/Resources) plus any owner-created or imported types.
 *
 * All data-backed types are equal: one table, one typed column per field,
 * managed through the same field-builder or import-from-DB tool. The legacy
 * JSON-backed `entries` pattern is deprecated; remaining legacy types (if any)
 * are shown in a muted group at the bottom.
 */
export function TypesScreen({
  custom,
  counts,
  disabled,
}: {
  custom: CustomTypeRow[];
  counts: Record<string, TypeCount>;
  disabled: string[];
}) {
  const disabledSet = new Set(disabled);
  const dataBacked = custom.filter((t) => !!t.tableName);
  const legacy = custom.filter((t) => !t.tableName);
  const rowFor = (t: (typeof CORE_TYPES)[number], i: number) => {
    const c = counts[t.key] ?? { total: 0, live: 0 };
    return (
      <TypeToggleRow
        key={t.key}
        typeKey={t.key}
        label={t.label}
        fields={t.fields}
        total={c.total}
        live={c.live}
        disabled={disabledSet.has(t.key)}
        canDisable={t.canDisable}
        first={i === 0}
        manageHref={t.manageHref}
      />
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <section>
        <h2 style={{ ...eyebrowStyle, margin: "0 0 var(--space-3)" }}>Built in</h2>
        <div style={boxStyle}>{CORE_TYPES.map(rowFor)}</div>
      </section>

      <section>
        <h2 style={{ ...eyebrowStyle, margin: "0 0 var(--space-3)" }}>Data-backed</h2>
        <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          Content types backed by their own real database table — one typed
          column per field. Create one with the field builder or import an
          existing table from your database.
        </p>

        {dataBacked.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
            {dataBacked.map((t) => (
              <DataTypeCard key={t.id} type={t} />
            ))}
          </div>
        ) : (
          <p style={{ marginBottom: "var(--space-6)", padding: "var(--space-6)", textAlign: "center", color: "var(--text-faint)", fontSize: "var(--text-sm)", border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-sm)" }}>
            No data-backed types yet. Create one with the field builder or
            import an existing table from your database.
          </p>
        )}

        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <CreateDataTypeForm />
          <ImportTablePicker />
        </div>
      </section>

      {legacy.length > 0 ? (
        <section>
          <h2 style={{ ...eyebrowStyle, margin: "0 0 var(--space-3)" }}>Legacy</h2>
          <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-faint)" }}>
            JSON-backed types from the previous storage model. Migrate these to
            data-backed types for typed columns and indexing.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
            {legacy.map((t) => (
              <TypeCard key={t.id} type={t} />
            ))}
          </div>
          <CreateTypeForm />
        </section>
      ) : null}
    </div>
  );
}

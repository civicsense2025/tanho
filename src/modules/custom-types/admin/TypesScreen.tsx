import type { CustomTypeRow } from "../schema";
import { CORE_TYPES, STRUCTURED_TYPES } from "./type-catalog";
import { TypeToggleRow } from "./TypeToggleRow";
import { CreateTypeForm } from "./CreateTypeForm";
import { CreateDataTypeForm } from "./CreateDataTypeForm";
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
 * Content Types — the design's two-section layout. "Built in" holds the core +
 * commerce types (Pages/Posts/Products/Collections); "Custom" holds the
 * structured types this site ships (Projects/Guides/Resources) plus any
 * owner-defined custom types. Each shipped row toggles on/off; a disabled type
 * is hidden from the site + search (real `content_types` state). Owner-defined
 * types keep their existing field-builder card.
 *
 * A custom type is one of two flavors: **legacy JSON-backed** (entries + data
 * JSON; edited via TypeCard) or **data-backed** (a real `ct_*` table, opt-in
 * via the content-schema layer; edited via DataTypeCard). They're partitioned
 * here by whether `tableName` is set, and shown in separate labelled groups so
 * the two aren't confused.
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
        <h2 style={{ ...eyebrowStyle, margin: "0 0 var(--space-3)" }}>Custom</h2>
        <div style={boxStyle}>{STRUCTURED_TYPES.map(rowFor)}</div>

        {legacy.length > 0 ? (
          <div style={{ marginTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {legacy.map((t) => (
              <TypeCard key={t.id} type={t} />
            ))}
          </div>
        ) : dataBacked.length === 0 ? (
          <p style={{ marginTop: "var(--space-4)", padding: "var(--space-6)", textAlign: "center", color: "var(--text-faint)", fontSize: "var(--text-sm)", border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-sm)" }}>
            No fully custom types yet — testimonials, team members, FAQs, whatever
            your site needs beyond the above.
          </p>
        ) : null}

        <div style={{ marginTop: "var(--space-6)" }}>
          <CreateTypeForm />
        </div>
      </section>

      <section>
        <h2 style={{ ...eyebrowStyle, margin: "0 0 var(--space-3)" }}>Data-backed</h2>
        <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          Content types backed by their own real database table — one typed
          column per field. Publish one to give it its own public pages.
        </p>

        {dataBacked.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
            {dataBacked.map((t) => (
              <DataTypeCard key={t.id} type={t} />
            ))}
          </div>
        ) : null}

        <CreateDataTypeForm />
      </section>
    </div>
  );
}

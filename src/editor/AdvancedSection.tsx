import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import type { Device } from "@/blocks/types";
import { DEVICE_TABS, summaryStyle } from "./style-fields-config";
import shell from "./editor-shell.module.css";

/**
 * The raw-value ("advanced") escape hatch: a property/value repeater that writes into
 * the CURRENT breakpoint's `advancedStyle` layer. Unlike the token <Select>s above, the
 * author types real CSS (px/hex/any allow-listed property). Everything typed here is
 * re-sanitised on save AND render (sanitizeAdvancedDecls — same gates as custom CSS), so
 * unknown properties, external urls, and breakout strings are dropped; what you type is
 * not guaranteed to survive verbatim. Always shows one trailing empty row to add to.
 */
export function AdvancedSection({
  layer,
  device,
  onChange,
}: {
  layer: Record<string, string>;
  device: Device;
  onChange: (rows: Array<{ prop: string; value: string }>) => void;
}) {
  const rows = Object.entries(layer).map(([prop, value]) => ({ prop, value }));
  const editable = [...rows, { prop: "", value: "" }];
  const label = DEVICE_TABS.find((t) => t.id === device)?.label ?? "";

  function update(i: number, patch: Partial<{ prop: string; value: string }>) {
    const next = editable.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onChange(next.filter((r) => r.prop.trim() || r.value.trim()));
  }

  return (
    <details>
      <summary style={summaryStyle}>Advanced values ({label})</summary>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
        <p
          role="note"
          style={{
            margin: 0,
            padding: "var(--space-2) var(--space-3)",
            fontSize: "var(--text-xs)",
            color: "var(--text)",
            background: "var(--accent-2-tint)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <strong>⚠ Raw CSS.</strong> Type any CSS property and value (e.g.{" "}
          <code>letter-spacing</code> / <code>0.05em</code>). Values are sanitised — unknown
          properties, external URLs and scripts are dropped. These apply on the{" "}
          <strong>{label}</strong> breakpoint and up.
        </p>
        {editable.map((r, i) => (
          <div key={i} className={shell.pairGrid}>
            <Field label={i === 0 ? "Property" : ""}>
              <Input
                value={r.prop}
                spellCheck={false}
                placeholder="letter-spacing"
                onChange={(e) => update(i, { prop: e.target.value })}
                style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}
              />
            </Field>
            <Field label={i === 0 ? "Value" : ""}>
              <Input
                value={r.value}
                spellCheck={false}
                placeholder="0.05em"
                onChange={(e) => update(i, { value: e.target.value })}
                style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}
              />
            </Field>
          </div>
        ))}
      </div>
    </details>
  );
}

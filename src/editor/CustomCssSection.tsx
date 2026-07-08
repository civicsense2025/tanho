import { Field } from "@/components/forms/Field";
import { Textarea } from "@/components/forms/Textarea";
import { CUSTOM_CSS_MAX } from "@/blocks/common";
import { CUSTOM_SCOPE_CLASS, blockTargetClass } from "@/lib/css-sanitizer";
import { headStyle, summaryStyle } from "./style-fields-config";

/**
 * The raw-CSS escape hatch UI: a textarea, a prominent author WARNING, and a
 * TARGETING GUIDE listing the stable hooks an author can select. Everything typed
 * here is sanitised (AST-rebuilt, allow-listed, page-root scoped) on save AND render;
 * unknown properties, external/js urls, @import, and admin-panel selectors are
 * dropped — so what you type is not guaranteed to survive verbatim.
 */
export function CustomCssSection({
  value,
  onChange,
  blockType,
  blockId,
}: {
  value: string;
  onChange: (css: string) => void;
  blockType?: string;
  blockId?: string;
}) {
  const blockClass = blockId ? blockTargetClass(blockId) : undefined;
  return (
    <details>
      <summary style={summaryStyle}>Custom CSS (advanced)</summary>
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
          <strong>⚠ Advanced.</strong> Custom CSS can break this page&apos;s layout. It is
          sanitised (external URLs, <code>@import</code>, scripts, and unknown properties are
          stripped) and scoped to your site&apos;s public pages — it can never affect the admin.
          Some declarations you type may be dropped.
        </p>

        <Field label="CSS" hint={`Max ${CUSTOM_CSS_MAX.toLocaleString()} characters. Selectors are auto-scoped.`}>
          <Textarea
            rows={8}
            value={value}
            spellCheck={false}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`.${CUSTOM_SCOPE_CLASS} .my-card { border-radius: 12px }`}
            style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}
          />
        </Field>

        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-2) var(--space-3)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-1)",
          }}
        >
          <span style={{ ...headStyle, color: "var(--text-faint)" }}>Targeting guide</span>
          <p style={{ margin: 0 }}>
            Rules are scoped under <code>.{CUSTOM_SCOPE_CLASS}</code> (your public pages).
            Stable hooks you can target:
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "2px" }}>
            {blockType ? (
              <li>
                This block type: <code>[data-block=&quot;{blockType}&quot;]</code>
              </li>
            ) : null}
            {blockClass ? (
              <li>
                This exact block: <code>.{blockClass}</code>
              </li>
            ) : null}
            <li>
              Any block: <code>[data-block]</code> (e.g. <code>[data-block=&quot;heading&quot;]</code>)
            </li>
            <li>
              Add your own class to a block, then target <code>.your-class</code>.
            </li>
          </ul>
          <p style={{ margin: 0, color: "var(--text-faint)" }}>
            <code>html</code>, <code>body</code> and <code>:root</code> are remapped to the page
            scope. Universal <code>*</code> selectors and <code>@import</code> are rejected.
          </p>
        </div>
      </div>
    </details>
  );
}

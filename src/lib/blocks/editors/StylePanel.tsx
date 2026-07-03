"use client";

import { useState } from "react";
import { Field, Select } from "@/components/ui";
import {
  SPACE_STEPS,
  STYLE_GROUPS,
  BREAKPOINTS,
  resolveCaps,
  type BaseStyleProps,
  type StyleProps,
  type StyleCapabilities,
  type StyleControl,
  type BreakpointId,
} from "../core/style-schema";

/**
 * Client-only style controls for one block, matching the server-renderers / client-editors
 * split (this lives beside the editors, never in core/ — BlockShell must not import it). It edits
 * the shared StyleProps: the "Mobile" tab writes the flat base (mobile / all-sizes) layer; the
 * "Tablet"/"Desktop" tabs write their override partials (which scale UP from base — mobile-first).
 *
 * Which controls appear is driven by the block's styleCaps via resolveCaps (inverted default:
 * absent caps ⇒ full universal set). Caps gate only the UI; stored style is never dropped.
 *
 * Built to be usable ON mobile: controls stack full-width, groups are collapsible <details>, and
 * tap targets use the shared Select (comfortable native control) rather than dense custom widgets.
 */
export function StylePanel({
  style,
  caps,
  onChange,
}: {
  style: StyleProps | undefined;
  caps?: StyleCapabilities;
  onChange: (style: StyleProps) => void;
}) {
  const [bp, setBp] = useState<BreakpointId>("base");
  const enabled = resolveCaps(caps);
  const base: StyleProps = style ?? {};

  // The layer currently being edited: the root object for "base", else the named partial.
  const activeLayer: BaseStyleProps = bp === "base" ? base : base[bp] ?? {};

  /** Write one field on the active breakpoint layer. Setting a value to undefined removes it,
   * so an empty override partial can collapse back to nothing. */
  function setField(field: keyof BaseStyleProps, value: unknown) {
    if (bp === "base") {
      const next = { ...base };
      if (value === undefined) delete next[field];
      else (next as Record<string, unknown>)[field] = value;
      onChange(next);
      return;
    }
    const layer: BaseStyleProps = { ...(base[bp] ?? {}) };
    if (value === undefined) delete layer[field];
    else (layer as Record<string, unknown>)[field] = value;
    const next: StyleProps = { ...base };
    if (Object.keys(layer).length) next[bp] = layer;
    else delete next[bp];
    onChange(next);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        borderTop: "1px solid var(--border)",
        paddingTop: "var(--space-3)",
      }}
    >
      {/* Breakpoint tabs — Mobile (base) is first/default; mobile-first authoring. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)" }}>
        {BREAKPOINTS.map((b) => {
          const active = b.id === bp;
          const overridden =
            b.id !== "base" && !!base[b.id] && Object.keys(base[b.id]!).length > 0;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setBp(b.id)}
              style={{
                flex: "1 1 auto",
                minHeight: "36px",
                padding: "var(--space-2) var(--space-3)",
                cursor: "pointer",
                fontFamily: "var(--font-label)",
                fontSize: "var(--text-2xs)",
                textTransform: "uppercase",
                letterSpacing: "var(--tracking-wide)",
                color: active ? "var(--text-on-accent)" : "var(--text-muted)",
                background: active ? "var(--accent)" : "var(--surface)",
                border: "1px solid",
                borderColor: active ? "var(--accent)" : "var(--border)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {b.label}
              {overridden ? " •" : ""}
            </button>
          );
        })}
      </div>

      {bp !== "base" && (
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
          Overrides for {bp} and up. Empty = inherits from Mobile.
        </p>
      )}

      {STYLE_GROUPS.map((group) => {
        const controls = group.controls.filter((c) => enabled.has(c.field));
        if (!controls.length) return null;
        return (
          <details key={group.title} open>
            <summary
              style={{
                cursor: "pointer",
                fontFamily: "var(--font-label)",
                fontSize: "var(--text-2xs)",
                textTransform: "uppercase",
                letterSpacing: "var(--tracking-wide)",
                color: "var(--text-muted)",
                padding: "var(--space-1) 0",
              }}
            >
              {group.title}
            </summary>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "var(--space-2)",
                marginTop: "var(--space-2)",
              }}
            >
              {controls.map((c) => (
                <ControlField
                  key={c.field}
                  control={c}
                  value={activeLayer[c.field]}
                  onChange={(v) => setField(c.field, v)}
                />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

/** One labeled control. Every kind resolves to a native Select (or checkbox) so it stays
 * comfortable to tap on mobile. The empty option ("—") clears the field (undefined). */
function ControlField({
  control,
  value,
  onChange,
}: {
  control: StyleControl;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (control.kind === "bool") {
    // visible: undefined ⇒ shown (default). Only an explicit false hides. Checked = visible.
    const checked = value !== false;
    return (
      <Field label={control.label}>
        <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", minHeight: "36px" }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked ? undefined : false)}
            style={{ width: "18px", height: "18px" }}
          />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            {checked ? "Visible" : "Hidden"}
          </span>
        </label>
      </Field>
    );
  }

  if (control.kind === "columns") {
    const options = ["1", "2", "3", "4", "5", "6"];
    return (
      <Field label={control.label}>
        <Select
          value={value === undefined ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        >
          <option value="">—</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      </Field>
    );
  }

  const options = control.kind === "space" ? SPACE_STEPS : control.options;
  return (
    <Field label={control.label}>
      <Select
        value={value === undefined ? "" : String(value)}
        onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    </Field>
  );
}

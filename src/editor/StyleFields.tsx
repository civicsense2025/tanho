"use client";

import { Field } from "@/components/forms/Field";
import { Select } from "@/components/forms/Select";
import { Toggle } from "@/components/admin/Seg";
import { useEditor } from "./store";
import {
  SPACE_STEPS,
  FONT_SIZES,
  FONT_WEIGHTS,
  LEADINGS,
  TRACKINGS,
  FONTS,
  TEXT_COLORS,
  BACKGROUNDS,
  BORDER_WIDTHS,
  BORDER_STYLES,
  BORDER_COLORS,
  RADII,
  SHADOWS,
  ALIGNS,
  type BlockStyle,
  type StyleLayer,
} from "@/blocks/common";
import type { Device } from "@/blocks/types";

/**
 * The universal per-block Style section (Phase C/D). Mounted in the Inspector's
 * Block tab for blocks that opted into `styleContent`. Tokens-only, MOBILE-FIRST:
 * the device the canvas previews (store `device`) is the breakpoint being edited —
 * "mobile" edits the base layer, "tablet"/"desktop" edit override partials that
 * scale up from base.
 *
 * Writes are immutable and breakpoint-safe: only the active layer's field changes;
 * sibling breakpoints are preserved. "Reset" DELETES the key (never writes
 * undefined) so the mobile-first merge in blocks/renderer/style.ts falls through
 * to base rather than being clobbered.
 */

type EnumControl = { field: keyof StyleLayer; label: string; options: readonly string[] };
type Group = { title: string; controls: EnumControl[] };

const GROUPS: Group[] = [
  {
    title: "Spacing",
    controls: [
      { field: "padTop", label: "Pad top", options: SPACE_STEPS },
      { field: "padRight", label: "Pad right", options: SPACE_STEPS },
      { field: "padBottom", label: "Pad bottom", options: SPACE_STEPS },
      { field: "padLeft", label: "Pad left", options: SPACE_STEPS },
    ],
  },
  {
    title: "Typography",
    controls: [
      { field: "font", label: "Font", options: FONTS },
      { field: "fontSize", label: "Size", options: FONT_SIZES },
      { field: "fontWeight", label: "Weight", options: FONT_WEIGHTS },
      { field: "leading", label: "Line height", options: LEADINGS },
      { field: "tracking", label: "Tracking", options: TRACKINGS },
      { field: "align", label: "Align", options: ALIGNS },
    ],
  },
  {
    title: "Color",
    controls: [
      { field: "textColor", label: "Text", options: TEXT_COLORS },
      { field: "background", label: "Background", options: BACKGROUNDS },
    ],
  },
  {
    title: "Border & effects",
    controls: [
      { field: "borderWidth", label: "Border width", options: BORDER_WIDTHS },
      { field: "borderStyle", label: "Border style", options: BORDER_STYLES },
      { field: "borderColor", label: "Border color", options: BORDER_COLORS },
      { field: "radius", label: "Radius", options: RADII },
      { field: "shadow", label: "Shadow", options: SHADOWS },
    ],
  },
];

const DEVICE_TABS: { id: Device; label: string }[] = [
  { id: "mobile", label: "Mobile" },
  { id: "tablet", label: "Tablet" },
  { id: "desktop", label: "Desktop" },
];

const layerKey = (d: Device): "base" | "tablet" | "desktop" => (d === "mobile" ? "base" : d);

export function StyleFields({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}) {
  const device = useEditor((s) => s.device);
  const setDevice = useEditor((s) => s.setDevice);

  const style = (content.style ?? {}) as NonNullable<BlockStyle>;
  const key = layerKey(device);
  const layer = (style[key] ?? {}) as StyleLayer;

  /** Immutable, breakpoint-safe write. `undefined` DELETES the field key (reset),
   * so a cleared override falls through to base rather than clobbering it. An
   * emptied layer collapses to no key. */
  function setField(field: keyof StyleLayer, value: string | undefined) {
    const nextLayer: StyleLayer = { ...layer };
    if (value === undefined || value === "") delete nextLayer[field];
    else (nextLayer as Record<string, string>)[field] = value;

    const nextStyle: NonNullable<BlockStyle> = { ...style };
    if (Object.keys(nextLayer).length) nextStyle[key] = nextLayer;
    else delete nextStyle[key];

    const nextContent = { ...content };
    if (Object.keys(nextStyle).length) nextContent.style = nextStyle;
    else delete nextContent.style;
    onChange(nextContent);
  }

  function overridden(d: Device): boolean {
    const k = layerKey(d);
    return k !== "base" && !!style[k] && Object.keys(style[k]!).length > 0;
  }

  const hideOn = (content.hideOn as Device[] | undefined) ?? [];
  function toggleHide(d: Device, hidden: boolean) {
    const next = hidden ? [...new Set([...hideOn, d])] : hideOn.filter((x) => x !== d);
    const nextContent = { ...content };
    if (next.length) nextContent.hideOn = next;
    else delete nextContent.hideOn;
    onChange(nextContent);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <span style={{ fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-muted)" }}>
        Style
      </span>

      {/* Breakpoint tabs — bound to the canvas device so preview + edit stay in sync. */}
      <div role="group" aria-label="Breakpoint" style={{ display: "flex", gap: "4px" }}>
        {DEVICE_TABS.map((t) => {
          const active = t.id === device;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={active}
              onClick={() => setDevice(t.id)}
              style={{
                flex: "1 1 0",
                minHeight: "34px",
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
              {t.label}
              {overridden(t.id) ? " •" : ""}
            </button>
          );
        })}
      </div>

      {device !== "mobile" && (
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
          Overrides for {device} and up. Empty fields inherit from Mobile.
        </p>
      )}

      {GROUPS.map((group) => (
        <details key={group.title} open={group.title === "Spacing"}>
          <summary style={{ cursor: "pointer", fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)", padding: "var(--space-1) 0" }}>
            {group.title}
          </summary>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
            {group.controls.map((c) => {
              const value = layer[c.field];
              return (
                <Field key={c.field} label={c.label}>
                  <Select
                    value={value === undefined ? "" : String(value)}
                    onChange={(e) => setField(c.field, e.target.value || undefined)}
                  >
                    <option value="">—</option>
                    {c.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </Select>
                </Field>
              );
            })}
          </div>
        </details>
      ))}

      {/* Per-device visibility — previously orphaned (ValueField skips hideOn). */}
      <Field label={`Visible on ${DEVICE_TABS.find((t) => t.id === device)?.label}`} hint="Hide this block on the current preview device.">
        <Toggle value={!hideOn.includes(device)} onChange={(v) => toggleHide(device, !v)} />
      </Field>
    </div>
  );
}

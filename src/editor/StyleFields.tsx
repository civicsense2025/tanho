"use client";

import { useState } from "react";
import { Field } from "@/components/forms/Field";
import { Select } from "@/components/forms/Select";
import { Textarea } from "@/components/forms/Textarea";
import { Input } from "@/components/forms/Input";
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
  OPACITIES,
  TRANSFORMS,
  TRANSITIONS,
  FILTERS,
  LAYOUT_DIRECTIONS,
  LAYOUT_WRAPS,
  LAYOUT_JUSTIFIES,
  LAYOUT_ALIGN_ITEMS,
  LAYOUT_POSITIONS,
  LAYOUT_Z_INDEXES,
  LAYOUT_ORDERS,
  LAYOUT_ALIGN_SELVES,
  LAYOUT_BASES,
  LAYOUT_GROWS,
  LAYOUT_SHRINKS,
  LAYOUT_COLS,
  LAYOUT_COL_TEMPLATES,
  LAYOUT_MIN_COL_WIDTHS,
  CUSTOM_CSS_MAX,
  STYLE_STATES,
  MOTION_TRIGGERS,
  MOTION_EFFECTS,
  MOTION_DURATIONS,
  MOTION_DELAYS,
  MOTION_EASINGS,
  type BlockStyle,
  type StyleLayer,
  type StyleState,
  type BlockLayout,
  type LayoutLayer,
} from "@/blocks/common";
import { CUSTOM_SCOPE_CLASS, blockTargetClass } from "@/lib/css-sanitizer";
import type { Device } from "@/blocks/types";
import shell from "./editor-shell.module.css";

/**
 * The universal per-block Style section (Phase C/D) PLUS the advanced Layout layer
 * and raw-CSS escape hatch (Phase 2a/2b). Mounted in the Inspector's Block tab.
 * Which sections appear is driven by explicit flags (the caller derives them from
 * the block's schema): `showStyle` (inner-box style layer), `showLayout` (flex/grid
 * layout layer — layout blocks only), `showCustomCss` (the escape hatch).
 *
 * Tokens-only, MOBILE-FIRST: the device the canvas previews (store `device`) is the
 * breakpoint being edited — "mobile" edits the base layer, "tablet"/"desktop" edit
 * override partials that scale up from base. Writes are immutable and breakpoint-safe;
 * "Reset" DELETES the key (never writes undefined) so the mobile-first merge in the
 * renderer falls through to base rather than being clobbered.
 */

type EnumControl<K> = { field: K; label: string; options: readonly string[] };
type Group<K> = { title: string; controls: EnumControl<K>[] };

const STYLE_GROUPS: Group<keyof StyleLayer>[] = [
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
    title: "Border",
    controls: [
      { field: "borderWidth", label: "Border width", options: BORDER_WIDTHS },
      { field: "borderStyle", label: "Border style", options: BORDER_STYLES },
      { field: "borderColor", label: "Border color", options: BORDER_COLORS },
      { field: "radius", label: "Radius", options: RADII },
      { field: "shadow", label: "Shadow", options: SHADOWS },
    ],
  },
  {
    title: "Effects",
    controls: [
      { field: "opacity", label: "Opacity", options: OPACITIES },
      { field: "transform", label: "Transform", options: TRANSFORMS },
      { field: "transition", label: "Transition", options: TRANSITIONS },
      { field: "filter", label: "Filter", options: FILTERS },
    ],
  },
];

/** Advanced layout controls — flex/grid/positioning, all token-enums. Split into
 *  sub-groups so the (large) control set stays navigable in the rail. */
const LAYOUT_GROUPS: Group<keyof LayoutLayer>[] = [
  {
    title: "Flow",
    controls: [
      { field: "direction", label: "Direction", options: LAYOUT_DIRECTIONS },
      { field: "wrap", label: "Wrap", options: LAYOUT_WRAPS },
      { field: "justify", label: "Justify", options: LAYOUT_JUSTIFIES },
      { field: "align", label: "Align items", options: LAYOUT_ALIGN_ITEMS },
      { field: "gap", label: "Gap", options: SPACE_STEPS },
      { field: "colGap", label: "Column gap", options: SPACE_STEPS },
      { field: "rowGap", label: "Row gap", options: SPACE_STEPS },
    ],
  },
  {
    title: "Grid columns",
    controls: [
      { field: "cols", label: "Columns", options: LAYOUT_COLS },
      { field: "colTemplate", label: "Uneven template", options: LAYOUT_COL_TEMPLATES },
      { field: "minColWidth", label: "Min col width (auto-fit)", options: LAYOUT_MIN_COL_WIDTHS },
    ],
  },
  {
    title: "Position",
    controls: [
      { field: "position", label: "Position", options: LAYOUT_POSITIONS },
      { field: "stickyTop", label: "Sticky top", options: SPACE_STEPS },
      { field: "zIndex", label: "Z-index", options: LAYOUT_Z_INDEXES },
    ],
  },
  {
    title: "Self placement",
    controls: [
      { field: "order", label: "Order", options: LAYOUT_ORDERS },
      { field: "alignSelf", label: "Align self", options: LAYOUT_ALIGN_SELVES },
      { field: "basis", label: "Basis", options: LAYOUT_BASES },
      { field: "grow", label: "Grow", options: LAYOUT_GROWS },
      { field: "shrink", label: "Shrink", options: LAYOUT_SHRINKS },
    ],
  },
];

const DEVICE_TABS: { id: Device; label: string }[] = [
  { id: "mobile", label: "Mobile" },
  { id: "tablet", label: "Tablet" },
  { id: "desktop", label: "Desktop" },
];

const layerKey = (d: Device): "base" | "tablet" | "desktop" => (d === "mobile" ? "base" : d);

const headStyle = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--text-2xs)",
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-wide)",
  color: "var(--text-muted)",
} as const;

export function StyleFields({
  content,
  onChange,
  showStyle = true,
  showLayout = false,
  showCustomCss = false,
  showAdvanced = false,
  showMotion = false,
  blockType,
  blockId,
}: {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  showStyle?: boolean;
  showLayout?: boolean;
  showCustomCss?: boolean;
  showAdvanced?: boolean;
  showMotion?: boolean;
  blockType?: string;
  blockId?: string;
}) {
  const device = useEditor((s) => s.device);
  const setDevice = useEditor((s) => s.setDevice);
  const key = layerKey(device);

  // Which interaction state the Style controls edit. "default" = the base rule; the
  // rest write into a nested per-state sub-layer (style[key][state]). Local (not in the
  // store) — it's a per-inspector editing mode, and the canvas can't preview :hover anyway.
  const [styleState, setStyleState] = useState<"default" | StyleState>("default");

  const style = (content.style ?? {}) as NonNullable<BlockStyle>;
  const styleBpLayer = (style[key] ?? {}) as StyleLayer;
  // The controls read/write the default fields, or the active state's sub-layer.
  const styleLayer = (styleState === "default"
    ? styleBpLayer
    : ((styleBpLayer as Record<string, unknown>)[styleState] ?? {})) as StyleLayer;
  const layout = (content.layout ?? {}) as NonNullable<BlockLayout>;
  const layoutLayer = (layout[key] ?? {}) as LayoutLayer;

  /** Immutable, breakpoint-safe write into a `bucket` (style|layout). `undefined`
   *  DELETES the field key (reset), so a cleared override falls through to base
   *  rather than clobbering it. An emptied layer collapses to no key; an emptied
   *  bucket collapses to no top-level key. For the `style` bucket, a non-default
   *  `styleState` nests the write one level deeper into `[state]`. */
  function setField(bucket: "style" | "layout", field: string, value: string | undefined) {
    const container = (content[bucket] ?? {}) as Record<string, Record<string, unknown>>;
    const layerForKey = { ...(container[key] ?? {}) };

    if (bucket === "style" && styleState !== "default") {
      // Nested per-state write: style[key][state][field].
      const stateLayer = { ...((layerForKey[styleState] as Record<string, string>) ?? {}) };
      if (value === undefined || value === "") delete stateLayer[field];
      else stateLayer[field] = value;
      if (Object.keys(stateLayer).length) layerForKey[styleState] = stateLayer;
      else delete layerForKey[styleState];
    } else {
      if (value === undefined || value === "") delete layerForKey[field];
      else layerForKey[field] = value;
    }

    const nextContainer = { ...container };
    if (Object.keys(layerForKey).length) nextContainer[key] = layerForKey;
    else delete nextContainer[key];

    const nextContent = { ...content };
    if (Object.keys(nextContainer).length) nextContent[bucket] = nextContainer;
    else delete nextContent[bucket];
    onChange(nextContent);
  }

  function overridden(bucket: "style" | "layout", d: Device): boolean {
    const k = layerKey(d);
    const container = content[bucket] as Record<string, Record<string, unknown>> | undefined;
    return k !== "base" && !!container?.[k] && Object.keys(container[k]).length > 0;
  }

  const hideOn = (content.hideOn as Device[] | undefined) ?? [];
  function toggleHide(d: Device, hidden: boolean) {
    const next = hidden ? [...new Set([...hideOn, d])] : hideOn.filter((x) => x !== d);
    const nextContent = { ...content };
    if (next.length) nextContent.hideOn = next;
    else delete nextContent.hideOn;
    onChange(nextContent);
  }

  function setCustomCss(css: string) {
    const nextContent = { ...content };
    if (css) nextContent.customCss = css;
    else delete nextContent.customCss;
    onChange(nextContent);
  }

  const motion = (content.motion ?? {}) as Record<string, string>;
  /** Write one motion field; empty/undefined clears it; an emptied motion object is deleted. */
  function setMotion(field: string, value: string | undefined) {
    const next = { ...motion };
    if (value === undefined || value === "") delete next[field];
    else next[field] = value;
    const nextContent = { ...content };
    if (Object.keys(next).length) nextContent.motion = next;
    else delete nextContent.motion;
    onChange(nextContent);
  }

  const advancedStyle = (content.advancedStyle ?? {}) as Record<string, Record<string, string>>;
  const advancedLayer = (advancedStyle[key] ?? {}) as Record<string, string>;

  /** Immutable, breakpoint-safe write into the raw `advancedStyle[key]` map. An empty
   *  prop/value clears the row; an emptied layer collapses; an emptied bucket is deleted —
   *  mirrors setField so the mobile-first merge falls through cleanly. */
  function setAdvancedRows(rows: Array<{ prop: string; value: string }>) {
    const layer: Record<string, string> = {};
    for (const r of rows) {
      const p = r.prop.trim();
      if (p && r.value.trim()) layer[p] = r.value.trim();
    }
    const nextBucket = { ...advancedStyle };
    if (Object.keys(layer).length) nextBucket[key] = layer;
    else delete nextBucket[key];
    const nextContent = { ...content };
    if (Object.keys(nextBucket).length) nextContent.advancedStyle = nextBucket;
    else delete nextContent.advancedStyle;
    onChange(nextContent);
  }

  const anyOverride = (d: Device) => overridden("style", d) || overridden("layout", d);
  const customCss = (content.customCss as string | undefined) ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <span style={headStyle}>Style</span>

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
              {anyOverride(t.id) ? " •" : ""}
            </button>
          );
        })}
      </div>

      {device !== "mobile" && (
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
          Overrides for {device} and up. Empty fields inherit from Mobile.
        </p>
      )}

      {showLayout &&
        LAYOUT_GROUPS.map((group) => (
          <details key={group.title} open={group.title === "Flow"}>
            <summary style={summaryStyle}>Layout · {group.title}</summary>
            <ControlGrid
              controls={group.controls}
              layer={layoutLayer as Record<string, string>}
              onSet={(field, v) => setField("layout", field, v)}
            />
          </details>
        ))}

      {showStyle && (
        <div role="group" aria-label="Interaction state" style={{ display: "flex", gap: "4px" }}>
          {(["default", ...STYLE_STATES] as const).map((st) => {
            const on = st === styleState;
            const has =
              st !== "default" &&
              Object.keys((styleBpLayer as Record<string, unknown>)[st] ?? {}).length > 0;
            return (
              <button
                key={st}
                type="button"
                aria-pressed={on}
                onClick={() => setStyleState(st)}
                style={{
                  flex: "1 1 0",
                  minHeight: "30px",
                  cursor: "pointer",
                  fontFamily: "var(--font-label)",
                  fontSize: "var(--text-2xs)",
                  textTransform: "capitalize",
                  color: on ? "var(--text-on-accent)" : "var(--text-muted)",
                  background: on ? "var(--accent-2)" : "var(--surface)",
                  border: "1px solid",
                  borderColor: on ? "var(--accent-2)" : "var(--border)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                {st}
                {has ? " •" : ""}
              </button>
            );
          })}
        </div>
      )}

      {showStyle && styleState !== "default" && (
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
          Editing the <strong>{styleState}</strong> state ({DEVICE_TABS.find((t) => t.id === device)?.label}).
          These styles apply only while the block is {styleState === "hover" ? "hovered" : styleState === "focus" ? "keyboard-focused" : "pressed"}.
        </p>
      )}

      {showStyle &&
        STYLE_GROUPS.map((group) => (
          <details key={group.title} open={group.title === "Spacing"}>
            <summary style={summaryStyle}>{group.title}</summary>
            <ControlGrid
              controls={group.controls}
              layer={styleLayer as Record<string, string>}
              onSet={(field, v) => setField("style", field, v)}
            />
          </details>
        ))}

      {showMotion && <MotionSection motion={motion} onSet={setMotion} />}

      {showAdvanced && (
        <AdvancedSection
          layer={advancedLayer}
          device={device}
          onChange={setAdvancedRows}
        />
      )}

      {showCustomCss && (
        <CustomCssSection
          value={customCss}
          onChange={setCustomCss}
          blockType={blockType}
          blockId={blockId}
        />
      )}

      {/* Per-device visibility — previously orphaned (ValueField skips hideOn). */}
      <Field label={`Visible on ${DEVICE_TABS.find((t) => t.id === device)?.label}`} hint="Hide this block on the current preview device.">
        <Toggle value={!hideOn.includes(device)} onChange={(v) => toggleHide(device, !v)} />
      </Field>
    </div>
  );
}

const summaryStyle = {
  cursor: "pointer",
  fontFamily: "var(--font-label)",
  fontSize: "var(--text-2xs)",
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-wide)",
  color: "var(--text-faint)",
  padding: "var(--space-1) 0",
} as const;

/** A responsive grid of enum <Select>s for one control group. Value "" = inherit. */
function ControlGrid({
  controls,
  layer,
  onSet,
}: {
  controls: { field: string; label: string; options: readonly string[] }[];
  layer: Record<string, string>;
  onSet: (field: string, value: string | undefined) => void;
}) {
  return (
    <div className={shell.controlGrid}>
      {controls.map((c) => {
        const value = layer[c.field];
        return (
          <Field key={c.field} label={c.label}>
            <Select value={value === undefined ? "" : String(value)} onChange={(e) => onSet(c.field, e.target.value || undefined)}>
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
  );
}

/**
 * The raw-CSS escape hatch UI: a textarea, a prominent author WARNING, and a
 * TARGETING GUIDE listing the stable hooks an author can select. Everything typed
 * here is sanitised (AST-rebuilt, allow-listed, page-root scoped) on save AND render;
 * unknown properties, external/js urls, @import, and admin-panel selectors are
 * dropped — so what you type is not guaranteed to survive verbatim.
 */
function CustomCssSection({
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

/**
 * The raw-value ("advanced") escape hatch: a property/value repeater that writes into
 * the CURRENT breakpoint's `advancedStyle` layer. Unlike the token <Select>s above, the
 * author types real CSS (px/hex/any allow-listed property). Everything typed here is
 * re-sanitised on save AND render (sanitizeAdvancedDecls — same gates as custom CSS), so
 * unknown properties, external urls, and breakout strings are dropped; what you type is
 * not guaranteed to survive verbatim. Always shows one trailing empty row to add to.
 */
function AdvancedSection({
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

/**
 * The motion (entrance-animation) controls: a small fixed set of enum selects. Not
 * per-breakpoint — an entrance effect is one behaviour. Choosing a trigger of "none"
 * (or leaving it blank) disables the animation. Content is never hidden without JS or
 * under reduced-motion (the renderer guards that), so this is purely additive polish.
 */
function MotionSection({
  motion,
  onSet,
}: {
  motion: Record<string, string>;
  onSet: (field: string, value: string | undefined) => void;
}) {
  const active = motion.trigger && motion.trigger !== "none";
  const controls: { field: string; label: string; options: readonly string[] }[] = [
    { field: "trigger", label: "Trigger", options: MOTION_TRIGGERS },
    { field: "effect", label: "Effect", options: MOTION_EFFECTS },
    { field: "duration", label: "Duration", options: MOTION_DURATIONS },
    { field: "delay", label: "Delay", options: MOTION_DELAYS },
    { field: "easing", label: "Easing", options: MOTION_EASINGS },
    { field: "stagger", label: "Stagger children", options: MOTION_DELAYS },
  ];
  return (
    <details open={!!active}>
      <summary style={summaryStyle}>Animation</summary>
      <div style={{ marginTop: "var(--space-2)" }}>
        <ControlGrid
          controls={controls}
          layer={motion}
          onSet={(field, v) => onSet(field, v)}
        />
        <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
          Plays on load or when scrolled into view. Respects “reduce motion”; never hides content without JS.
        </p>
      </div>
    </details>
  );
}

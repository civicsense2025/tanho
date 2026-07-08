"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Field } from "@/components/forms/Field";
import { Seg, Toggle } from "@/components/admin/Seg";
import { useEditor } from "./store";
import { STYLE_STATES, type BlockStyle, type StyleLayer, type StyleState, type BlockLayout, type LayoutLayer } from "@/blocks/common";
import type { Device } from "@/blocks/types";
import shell from "./editor-shell.module.css";
import {
  STYLE_GROUPS,
  LAYOUT_GROUPS,
  DEVICE_TABS,
  DEVICE_META,
  layerKey,
  summaryStyle,
  zoneHeaderStyle,
  zoneHeaderFirstStyle,
} from "./style-fields-config";
import { useStyleFieldsActions } from "./useStyleFieldsActions";
import { ControlGrid } from "./ControlGrid";
import { CustomCssSection } from "./CustomCssSection";
import { AdvancedSection } from "./AdvancedSection";
import { MotionSection } from "./MotionSection";

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

  const {
    setField,
    resetDevice,
    hideOn,
    toggleHide,
    setCustomCss,
    motion,
    setMotion,
    advancedLayer,
    setAdvancedRows,
    anyOverride,
    customCss,
  } = useStyleFieldsActions({ content, onChange, key, styleState });

  const deviceLabel = DEVICE_TABS.find((t) => t.id === device)?.label ?? "";
  const hasOverride = device !== "mobile" && anyOverride(device);
  const stateHasContent =
    styleState !== "default" &&
    Object.keys((styleBpLayer as Record<string, unknown>)[styleState] ?? {}).length > 0;
  const canReset =
    device !== "mobile" && (styleState === "default" ? anyOverride(device) : stateHasContent);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* ── Zone 1: Style ── */}
      {showStyle && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <span style={zoneHeaderFirstStyle}>Style</span>

          {/* Per-device styling indicator. The top-bar DeviceToggle is the single
              source of truth for the previewed/edited device; this surfaces the
              mobile-first override semantics and a reset for the active breakpoint. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-1)",
              padding: "var(--space-2) var(--space-3)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              background: "var(--surface)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)" }}>
              <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", color: "var(--text)" }}>
                Editing {deviceLabel}
              </span>
              {hasOverride && (
                <span style={{ fontSize: "var(--text-2xs)", color: "var(--accent)" }}>Has overrides •</span>
              )}
            </div>
            <span style={{ fontSize: "var(--text-2xs)", color: "var(--text-faint)" }}>{DEVICE_META[device].blurb}</span>
            {device !== "mobile" && !anyOverride(device) && (
              <span style={{ fontSize: "var(--text-2xs)", color: "var(--text-faint)" }}>
                No overrides set — inheriting from Mobile.
              </span>
            )}
            {canReset && (
              <button
                type="button"
                className={shell.ghostLink}
                onClick={resetDevice}
                style={{ marginTop: "var(--space-1)" }}
              >
                <RotateCcw size={12} /> Reset {deviceLabel}
                {styleState !== "default" ? ` ${styleState}` : ""} overrides
              </button>
            )}
          </div>

          {/* Interaction state selector — "default" = base rule; rest write per-state sub-layers. */}
          <Seg
            value={styleState}
            onChange={(v) => setStyleState(v as "default" | StyleState)}
            options={[
              { value: "default", label: "Default" },
              ...STYLE_STATES.map((s) => {
                const has =
                  Object.keys((styleBpLayer as Record<string, unknown>)[s] ?? {}).length > 0;
                return {
                  value: s,
                  label: s.charAt(0).toUpperCase() + s.slice(1) + (has ? " •" : ""),
                };
              }),
            ]}
          />

          {styleState !== "default" && (
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
              Editing the <strong>{styleState}</strong> state ({DEVICE_TABS.find((t) => t.id === device)?.label}).
              These styles apply only while the block is {styleState === "hover" ? "hovered" : styleState === "focus" ? "keyboard-focused" : "pressed"}.
            </p>
          )}

          {STYLE_GROUPS.map((group) => (
            <details key={group.title} open={group.title === "Spacing"}>
              <summary style={summaryStyle}>{group.title}</summary>
              <ControlGrid
                controls={group.controls}
                layer={styleLayer as Record<string, string>}
                onSet={(field, v) => setField("style", field, v)}
              />
            </details>
          ))}
        </div>
      )}

      {/* ── Zone 2: Layout ── */}
      {showLayout && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <span style={zoneHeaderStyle}>Layout</span>
          {LAYOUT_GROUPS.map((group) => (
            <details key={group.title} open={group.title === "Flow"}>
              <summary style={summaryStyle}>{group.title}</summary>
              <ControlGrid
                controls={group.controls}
                layer={layoutLayer as Record<string, string>}
                onSet={(field, v) => setField("layout", field, v)}
              />
            </details>
          ))}
        </div>
      )}

      {/* ── Zone 3: Advanced ── */}
      {(showMotion || showAdvanced || showCustomCss) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <span style={zoneHeaderStyle}>Advanced</span>

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
      )}
    </div>
  );
}

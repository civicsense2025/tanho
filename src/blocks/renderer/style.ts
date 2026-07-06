import type { CSSProperties } from "react";
import {
  SPACE_STEP,
  FONT_SIZE_VAR,
  FONT_WEIGHT_VALUE,
  LEADING_VAR,
  TRACKING_VAR,
  FONT_VAR,
  TEXT_COLOR_VAR,
  BACKGROUND_VAR,
  BORDER_WIDTH_VALUE,
  BORDER_COLOR_VAR,
  RADIUS_VAR,
  SHADOW_VAR,
  OPACITY_VALUE,
  TRANSFORM_VALUE,
  TRANSITION_VALUE,
  FILTER_VALUE,
  type BlockStyle,
  type StyleLayer,
} from "../common";
import type { Device } from "../types";

/**
 * The one place a block's style enums become real CSS — the render-side twin of
 * the token maps in blocks/common.ts. Pure: no React, no async, no mutation.
 *
 * MOBILE-FIRST resolution: `base` is mobile / all-sizes; `tablet`/`desktop` layer
 * OVERRIDES on top as the device grows (desktop ⊃ tablet ⊃ base). "Unset on a
 * breakpoint" is a MISSING key — an explicit `undefined` in an override would
 * clobber base through the spread, so the editor deletes keys rather than writing
 * undefined, and styleToCss skips undefined/empty so the spread falls through.
 *
 * INNER-BOX ONLY: padding / typography / colour / border / radius / shadow /
 * text-align. Never margin or maxWidth — this is applied on the chrome-bearing
 * <div data-block> wrapper, and margin/maxWidth there would break the parent
 * gutter/full-bleed math and shift editor selection chrome.
 */

/** Merge the three layers down to the one that applies at `device`. Returns a
 * fresh object; never mutates the inputs. */
export function resolveStyleLayer(style: BlockStyle | undefined, device: Device): StyleLayer {
  if (!style) return {};
  return {
    ...style.base,
    ...(device !== "mobile" ? style.tablet : undefined),
    ...(device === "desktop" ? style.desktop : undefined),
  };
}

/** Map one resolved layer to a React inline-style object. Undefined/empty enum
 * values are skipped so nothing emits `undefined` and the mobile-first merge can
 * fall through to base. Used by the EDITOR's single-device live preview (canvas +
 * stacked preview), which resolves one layer client-side rather than shipping all
 * three as real CSS — see styleDecls for the public-page path. */
export function styleToCss(layer: StyleLayer): CSSProperties {
  const s: Record<string, string> = {};

  const padTop = layer.padTop && SPACE_STEP[layer.padTop];
  const padRight = layer.padRight && SPACE_STEP[layer.padRight];
  const padBottom = layer.padBottom && SPACE_STEP[layer.padBottom];
  const padLeft = layer.padLeft && SPACE_STEP[layer.padLeft];
  if (padTop) s.paddingTop = padTop;
  if (padRight) s.paddingRight = padRight;
  if (padBottom) s.paddingBottom = padBottom;
  if (padLeft) s.paddingLeft = padLeft;

  if (layer.fontSize) s.fontSize = FONT_SIZE_VAR[layer.fontSize];
  if (layer.fontWeight) s.fontWeight = FONT_WEIGHT_VALUE[layer.fontWeight];
  if (layer.leading) s.lineHeight = LEADING_VAR[layer.leading];
  if (layer.tracking) s.letterSpacing = TRACKING_VAR[layer.tracking];
  if (layer.font) s.fontFamily = FONT_VAR[layer.font];

  if (layer.textColor) s.color = TEXT_COLOR_VAR[layer.textColor];
  if (layer.background) s.background = BACKGROUND_VAR[layer.background];

  // A border only shows when a non-zero width is chosen; style/colour default sensibly.
  if (layer.borderWidth && layer.borderWidth !== "none") {
    s.borderWidth = BORDER_WIDTH_VALUE[layer.borderWidth];
    s.borderStyle = layer.borderStyle ?? "solid";
    s.borderColor = BORDER_COLOR_VAR[layer.borderColor ?? "border"];
  }
  if (layer.radius) s.borderRadius = RADIUS_VAR[layer.radius];
  if (layer.shadow) s.boxShadow = SHADOW_VAR[layer.shadow];

  if (layer.align) s.textAlign = layer.align;

  // Effects. opacity "100" → "1" is a real value, so guard on the KEY being set
  // (not truthiness of the mapped value) — "0" maps to "0" which is falsy.
  if (layer.opacity !== undefined) s.opacity = OPACITY_VALUE[layer.opacity];
  if (layer.transform) s.transform = TRANSFORM_VALUE[layer.transform];
  if (layer.transition) s.transition = TRANSITION_VALUE[layer.transition];
  if (layer.filter) s.filter = FILTER_VALUE[layer.filter];

  return s as CSSProperties;
}

/**
 * Map one resolved layer to real CSS declarations (kebab-case property names —
 * NOT derived from styleToCss's camelCase object, so there's no casing-conversion
 * step that could silently mis-map a property). This is the PUBLIC-PAGE twin of
 * styleToCss: the public page is served on one device branch (see BlockRenderer),
 * so per-breakpoint style must ship as real CSS in a scoped <style> with @media
 * overrides, exactly like the layout layer's layoutToVars/layoutBaseDecls split.
 * Declarations only — no selector, no braces; the caller (buildStyleCss in
 * BlockRenderer) wraps these per breakpoint.
 */
export function styleDecls(layer: StyleLayer): Record<string, string> {
  const s: Record<string, string> = {};

  const padTop = layer.padTop && SPACE_STEP[layer.padTop];
  const padRight = layer.padRight && SPACE_STEP[layer.padRight];
  const padBottom = layer.padBottom && SPACE_STEP[layer.padBottom];
  const padLeft = layer.padLeft && SPACE_STEP[layer.padLeft];
  if (padTop) s["padding-top"] = padTop;
  if (padRight) s["padding-right"] = padRight;
  if (padBottom) s["padding-bottom"] = padBottom;
  if (padLeft) s["padding-left"] = padLeft;

  if (layer.fontSize) s["font-size"] = FONT_SIZE_VAR[layer.fontSize];
  if (layer.fontWeight) s["font-weight"] = FONT_WEIGHT_VALUE[layer.fontWeight];
  if (layer.leading) s["line-height"] = LEADING_VAR[layer.leading];
  if (layer.tracking) s["letter-spacing"] = TRACKING_VAR[layer.tracking];
  if (layer.font) s["font-family"] = FONT_VAR[layer.font];

  if (layer.textColor) s.color = TEXT_COLOR_VAR[layer.textColor];
  if (layer.background) s.background = BACKGROUND_VAR[layer.background];

  if (layer.borderWidth && layer.borderWidth !== "none") {
    s["border-width"] = BORDER_WIDTH_VALUE[layer.borderWidth];
    s["border-style"] = layer.borderStyle ?? "solid";
    s["border-color"] = BORDER_COLOR_VAR[layer.borderColor ?? "border"];
  }
  if (layer.radius) s["border-radius"] = RADIUS_VAR[layer.radius];
  if (layer.shadow) s["box-shadow"] = SHADOW_VAR[layer.shadow];

  if (layer.align) s["text-align"] = layer.align;

  // Effects — guard on the KEY (opacity "0" maps to the falsy string "0").
  if (layer.opacity !== undefined) s.opacity = OPACITY_VALUE[layer.opacity];
  if (layer.transform) s.transform = TRANSFORM_VALUE[layer.transform];
  if (layer.transition) s.transition = TRANSITION_VALUE[layer.transition];
  if (layer.filter) s.filter = FILTER_VALUE[layer.filter];

  return s;
}

/** True when a resolved layer produces at least one declaration — lets the walker
 * keep today's exact wrapper (no style prop) for unstyled blocks. Values are
 * enum-or-undefined, so a defined value always yields CSS. */
export function hasStyle(layer: StyleLayer): boolean {
  return Object.values(layer).some((v) => v !== undefined);
}

// ─── Shared safe-value serialization (style + layout scoped <style> output) ──
//
// One regex, two shapes: layoutToVars (layout-style.ts) emits --pbl-* custom
// properties; styleDecls (above) emits plain kebab-case declarations. Both are
// re-checked here against the same safe-value discipline as
// modules/theme/css-vars.ts before landing in a <style> — belt-and-braces,
// since every value reaching either is already token-enum-mapped (keyword /
// bounded int / var(--token)), never free text. Shared (not duplicated per
// call site) so the one regex can't drift between BlockRenderer.tsx's
// public-page path and the editor's single-device live-preview path.

/** Re-check every emitted value against the same safe-value discipline as
 *  modules/theme/css-vars.ts before it reaches a <style>. */
export const SAFE_DECL_RE = /^[#a-zA-Z0-9(),.\s%\-\/_]+$/;

/** Serialize a {--pbl-*: value} custom-property bag to `k:v;…`, dropping any
 *  unsafe value. */
export function serializeVars(vars: Record<string, string>): string {
  return Object.entries(vars)
    .filter(([k, v]) => k.startsWith("--") && SAFE_DECL_RE.test(v))
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

/** Serialize a {kebab-prop: value} plain-CSS-declaration bag to `k:v;…`,
 *  dropping any unsafe value. Sibling of serializeVars for styleDecls' output,
 *  which emits real property names rather than --pbl-* custom properties. */
export function serializeDecls(decls: Record<string, string>): string {
  return Object.entries(decls)
    .filter(([, v]) => SAFE_DECL_RE.test(v))
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

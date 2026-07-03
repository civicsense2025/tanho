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
 * fall through to base. */
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

  return s as CSSProperties;
}

/** True when a resolved layer produces at least one declaration — lets the walker
 * keep today's exact wrapper (no style prop) for unstyled blocks. Values are
 * enum-or-undefined, so a defined value always yields CSS. */
export function hasStyle(layer: StyleLayer): boolean {
  return Object.values(layer).some((v) => v !== undefined);
}

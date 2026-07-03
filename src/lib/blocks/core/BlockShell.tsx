import type { CSSProperties, ReactNode } from "react";
import {
  PADDING_SPACE,
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
  BREAKPOINT_MINWIDTH,
  type BaseStyleProps,
  type StyleProps,
} from "./style-schema";

/**
 * The single point where a block's StyleProps become real styles. A Server Component (no
 * "use client") so it stays in the public render bundle. Applied centrally by RenderBlock, so
 * individual renderers never need to know about alignment/width/spacing/typography/color/theme —
 * they render their content and BlockShell positions/sizes/paints it. This is the reusability
 * payoff: every block gets consistent, token-safe style controls for free.
 *
 * MOBILE-FIRST: the flat base object is the mobile / all-sizes layer. Optional `tablet`/`desktop`
 * override partials scale UP from it via min-width CONTAINER queries. Base-only blocks (and every
 * legacy flat style) render with a single inline-styled wrapper and no queries — identical at all
 * widths. Only when a responsive override exists do we emit a scoped <style> with @container rules
 * (inline styles can't hold queries), and only then does the container/target split apply.
 *
 * With NO style (the common case, and every legacy block with an empty object), this renders
 * children directly with NO wrapping element — preserving the exact DOM of pre-style content so
 * nothing regresses. A wrapper appears only once a block actually carries style.
 */

/** Any own (base) style field set? Absent tablet/desktop don't count — an object of only
 * `{ tablet: {...} }` with no base fields still needs a wrapper, handled by hasResponsive. */
function hasBaseStyle(style?: StyleProps): boolean {
  if (!style) return false;
  return Object.entries(style).some(
    ([k, v]) => k !== "tablet" && k !== "desktop" && v !== undefined
  );
}

function hasResponsive(style?: StyleProps): boolean {
  return !!(style?.tablet && Object.keys(style.tablet).length) ||
    !!(style?.desktop && Object.keys(style.desktop).length);
}

/**
 * Map one layer's BaseStyleProps to a plain CSS-declaration record ({ "text-align": "center" }).
 * Kebab-cased property names so the same output feeds both an inline style object (via
 * declsToCSSProperties) and a scoped-<style> rule string (via declsToRuleBody). Only defined
 * fields produce declarations, so an override layer emits exactly the props it changes.
 *
 * Accent-swap and theme are handled outside this function (accent re-points custom properties;
 * theme is a data-attribute) because they're subtree concerns, not per-breakpoint declarations.
 */
function styleLayerToDecls(style: BaseStyleProps): Record<string, string> {
  const d: Record<string, string> = {};

  if (style.align) d["text-align"] = style.align;

  if (style.width === "full-bleed") {
    d["max-width"] = "none";
  } else if (style.width) {
    d["max-width"] = `var(--width-${style.width})`;
    d["margin-inline"] = "auto";
  }

  // Legacy vertical padding shorthand (only if no explicit per-side override supersedes it).
  if (style.padding && style.padding !== "none") {
    d["padding-block"] = `var(--space-${PADDING_SPACE[style.padding]})`;
  }
  if (style.padTop) d["padding-top"] = SPACE_STEP[style.padTop];
  if (style.padRight) d["padding-right"] = SPACE_STEP[style.padRight];
  if (style.padBottom) d["padding-bottom"] = SPACE_STEP[style.padBottom];
  if (style.padLeft) d["padding-left"] = SPACE_STEP[style.padLeft];

  if (style.fontSize) d["font-size"] = FONT_SIZE_VAR[style.fontSize];
  if (style.fontWeight) d["font-weight"] = FONT_WEIGHT_VALUE[style.fontWeight];
  if (style.leading) d["line-height"] = LEADING_VAR[style.leading];
  if (style.tracking) d["letter-spacing"] = TRACKING_VAR[style.tracking];
  if (style.font) d["font-family"] = FONT_VAR[style.font];

  if (style.color) d["color"] = TEXT_COLOR_VAR[style.color];
  if (style.background) d["background"] = BACKGROUND_VAR[style.background];

  // A border shows only when a non-zero width is chosen; style/color default sensibly.
  if (style.borderWidth && style.borderWidth !== "none") {
    d["border-width"] = BORDER_WIDTH_VALUE[style.borderWidth];
    d["border-style"] = style.borderStyle ?? "solid";
    d["border-color"] = BORDER_COLOR_VAR[style.borderColor ?? "border"];
  }
  if (style.radius) d["border-radius"] = RADIUS_VAR[style.radius];
  if (style.shadow) d["box-shadow"] = SHADOW_VAR[style.shadow];

  if (style.visible === false) d["display"] = "none";

  return d;
}

/** Convert a kebab-cased declaration record into a React inline-style object. */
function declsToCSSProperties(decls: Record<string, string>): CSSProperties {
  const s: Record<string, string> = {};
  for (const [k, v] of Object.entries(decls)) s[k] = v;
  return s as CSSProperties;
}

/** Convert a declaration record into a CSS rule body string ("a:b;c:d;"). */
function declsToRuleBody(decls: Record<string, string>): string {
  return Object.entries(decls)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

/** Re-point accent custom properties for a subtree (accent-2 swap). Returns inline vars. */
function accentVars(style?: StyleProps): Record<string, string> {
  if (style?.accent !== "accent-2") return {};
  return {
    "--accent": "var(--accent-2)",
    "--accent-hover": "var(--accent-2-hover)",
    "--accent-tint": "var(--accent-2-tint)",
  };
}

/** Deterministic, order-independent hash of the style object → a stable class suffix. Pure and
 * server-computable (no useId), so server and client agree and identical styles dedupe. */
function styleHash(style: StyleProps): string {
  const json = JSON.stringify(style, Object.keys(style).sort());
  let h = 2166136261;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function BlockShell({ style, children }: { style?: StyleProps; children: ReactNode }) {
  const responsive = hasResponsive(style);
  if (!hasBaseStyle(style) && !responsive) return <>{children}</>;

  const themeAttr = style?.theme && style.theme !== "inherit" ? style.theme : undefined;
  const accent = accentVars(style);

  // Base layer declarations (mobile / all-sizes).
  const baseDecls = style ? styleLayerToDecls(style) : {};

  // ---- Non-responsive fast path: single inline-styled wrapper (today's behavior, extended). ----
  if (!responsive) {
    const s = declsToCSSProperties(baseDecls);
    (s as Record<string, string>)["container-type"] = "inline-size";
    Object.assign(s as Record<string, string>, accent);
    return (
      <div data-block data-theme={themeAttr} style={s}>
        {children}
      </div>
    );
  }

  // ---- Responsive path: outer element is the CONTAINER; inner element carries the class the
  // @container rules target (a container query can't match its own container element). ----
  const cls = `blk-${styleHash(style as StyleProps)}`;
  const tablet = style?.tablet ? styleLayerToDecls(style.tablet) : {};
  const desktop = style?.desktop ? styleLayerToDecls(style.desktop) : {};

  // Mobile-first: base first, then tablet, then desktop — wider rules last so they win in source
  // order for equal specificity.
  const rules = [
    `.${cls}{${declsToRuleBody(baseDecls)}}`,
    Object.keys(tablet).length
      ? `@container (min-width:${BREAKPOINT_MINWIDTH.tablet}){.${cls}{${declsToRuleBody(tablet)}}}`
      : "",
    Object.keys(desktop).length
      ? `@container (min-width:${BREAKPOINT_MINWIDTH.desktop}){.${cls}{${declsToRuleBody(desktop)}}}`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const outerStyle: Record<string, string> = { "container-type": "inline-size", ...accent };

  return (
    <div data-block data-theme={themeAttr} style={outerStyle as CSSProperties}>
      <style>{rules}</style>
      <div className={cls}>{children}</div>
    </div>
  );
}

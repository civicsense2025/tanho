import type { ReactNode } from "react";
import { blockDef } from "../registry";
import { blockResolvers } from "../resolvers";
import { paywallSchema } from "../paywall/fields";
import { resolvePaywallPreview } from "@/modules/entitlements/gate";
import { styleDecls, serializeVars, serializeDecls } from "./style";
import { layoutToVars, layoutBaseDecls, layoutIsGrid, hasAnyLayout } from "./layout-style";
import { buildMotionCss, motionAttrs } from "./motion-style";
import { sanitizeCss, sanitizeAdvancedDecls, blockTargetClass } from "@/lib/css-sanitizer";
import { STYLE_STATES } from "../common";
import { hasCapability } from "../capabilities";
import { UnsupportedBlock } from "../UnsupportedBlock";
import { loadSymbol } from "@/modules/blocks/symbol-queries";
import { applyOverrides, decideExpansion } from "../symbol/expand";
import { substituteRecordTokens } from "../collection/bind";
import type { SymbolOverride } from "../symbol/fields";
import type { BlockStyle, BlockLayout, BlockAdvancedStyle, BlockMotion, StyleLayer, StyleState } from "../common";
import type { BlockNode, Device, OutlineHeadingCtx, PageCtx, RenderViewer } from "../types";

/**
 * Tablet/desktop min-widths for the layout AND style layers' real @media
 * responsiveness (mobile-first cascade: an override applies at its breakpoint
 * and up). The public page is served on ONE device branch, so per-breakpoint
 * overrides must ship as real CSS (not a ctx.device branch) — see
 * blocks/renderer/layout-style.ts and blocks/renderer/style.ts.
 */
const BP_TABLET = 768;
const BP_DESKTOP = 1024;

/**
 * Exact (non-cascading) viewport ranges for hideOn — unlike style/layout's
 * mobile-first overrides, "hide on tablet" must NOT also hide on desktop, so
 * each device gets its own non-overlapping range rather than a min-width floor.
 */
const HIDE_ON_RANGE: Record<Device, string> = {
  mobile: `(max-width:${BP_TABLET - 1}px)`,
  tablet: `(min-width:${BP_TABLET}px) and (max-width:${BP_DESKTOP - 1}px)`,
  desktop: `(min-width:${BP_DESKTOP}px)`,
};

/**
 * Build the scoped <style> text for a layout block's advanced-layout layer:
 * base custom-properties + the consuming declaration on the block's own class, then
 * @media overrides that only swap the custom properties. Returns "" when the block
 * sets no layout controls. Token-only by construction (values come from the enum
 * maps in layout-style.ts) and additionally safe-value filtered.
 */
function buildLayoutCss(cls: string, layout: BlockLayout | undefined): string {
  if (!hasAnyLayout(layout)) return "";
  const sel = `.${cls}`;
  const isGrid = layoutIsGrid(layout);
  const base = serializeVars(layoutToVars(layout!.base ?? {}));
  const tablet = serializeVars(layoutToVars(layout!.tablet ?? {}));
  const desktop = serializeVars(layoutToVars(layout!.desktop ?? {}));

  let css = `${sel}{${base ? base + ";" : ""}${layoutBaseDecls(isGrid)}}`;
  if (tablet) css += `@media (min-width:${BP_TABLET}px){${sel}{${tablet}}}`;
  if (desktop) css += `@media (min-width:${BP_DESKTOP}px){${sel}{${desktop}}}`;
  return css;
}

/**
 * Build the scoped <style> text for a block's universal inner-box style layer:
 * base declarations on the block's own class, then @media overrides for
 * tablet/desktop (mobile-first: an override applies at its breakpoint and up,
 * matching resolveStyleLayer's merge). Returns "" when the block sets no style.
 * This is the PUBLIC-PAGE path — the public page is served on one device branch,
 * so (unlike the editor's single-device resolveStyleLayer+styleToCss) responsive
 * style can't be a ctx.device branch; it must be real CSS. Token-only by
 * construction (values come from the enum maps in blocks/common.ts via styleDecls)
 * and additionally safe-value filtered.
 */
/** CSS pseudo-class for each interaction state. `:focus-visible` (not `:focus`) so a
 *  mouse click on a button doesn't leave the focus ring stuck — keyboard focus only. */
const STATE_SELECTOR: Record<StyleState, string> = {
  hover: ":hover",
  focus: ":focus-visible",
  active: ":active",
};

/**
 * One breakpoint's worth of rules for the style layer: the default declarations on
 * `.pb-<id>` PLUS a rule per interaction state (`:hover`/`:focus-visible`/`:active`).
 * Returns a `.pb-<id>{…}.pb-<id>:hover{…}…` string (no @media wrapper — the caller adds
 * it). Empty when the layer sets nothing.
 */
function styleLayerRules(sel: string, layer: StyleLayer | undefined): string {
  if (!layer) return "";
  let out = "";
  const base = serializeDecls(styleDecls(layer));
  if (base) out += `${sel}{${base}}`;
  for (const state of STYLE_STATES) {
    const sub = layer[state];
    if (!sub) continue;
    const decls = serializeDecls(styleDecls(sub));
    if (decls) out += `${sel}${STATE_SELECTOR[state]}{${decls}}`;
  }
  return out;
}

/**
 * Build the scoped <style> text for a block's universal inner-box style layer:
 * base declarations on the block's own class, then @media overrides for
 * tablet/desktop (mobile-first: an override applies at its breakpoint and up,
 * matching resolveStyleLayer's merge). Interaction states (hover/focus/active) are
 * emitted per breakpoint too, so a state can differ by device. Returns "" when the
 * block sets no style. This is the PUBLIC-PAGE path — the public page is served on
 * one device branch, so (unlike the editor's single-device resolveStyleLayer+
 * styleToCss) responsive style can't be a ctx.device branch; it must be real CSS.
 * Token-only by construction (values come from the enum maps in blocks/common.ts via
 * styleDecls) and additionally safe-value filtered.
 */
function buildStyleCss(cls: string, style: BlockStyle | undefined): string {
  if (!style) return "";
  const sel = `.${cls}`;
  const base = styleLayerRules(sel, style.base);
  const tablet = styleLayerRules(sel, style.tablet);
  const desktop = styleLayerRules(sel, style.desktop);
  if (!base && !tablet && !desktop) return "";

  let css = base;
  if (tablet) css += `@media (min-width:${BP_TABLET}px){${tablet}}`;
  if (desktop) css += `@media (min-width:${BP_DESKTOP}px){${desktop}}`;
  return css;
}

/** Serialize one already-cleaned advanced-decls map to a `k:v;…` body. */
function advancedBody(layer: Record<string, string> | undefined): string {
  if (!layer) return "";
  return Object.entries(sanitizeAdvancedDecls(layer))
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

/**
 * Build the scoped <style> text for a block's RAW-VALUE advanced layer — the escape
 * hatch sibling of buildStyleCss. Same mobile-first base + @media tablet/desktop shape,
 * but the declarations are free-form `property: value` the author typed. RE-sanitised
 * here via `sanitizeAdvancedDecls` (defence in depth — already cleaned on save) with the
 * SAME gates as customCss. Emitted AFTER the token style rule so advanced overrides win.
 */
function buildAdvancedCss(cls: string, advanced: BlockAdvancedStyle | undefined): string {
  if (!advanced) return "";
  const sel = `.${cls}`;
  const base = advancedBody(advanced.base);
  const tablet = advancedBody(advanced.tablet);
  const desktop = advancedBody(advanced.desktop);
  if (!base && !tablet && !desktop) return "";

  let css = base ? `${sel}{${base}}` : "";
  if (tablet) css += `@media (min-width:${BP_TABLET}px){${sel}{${tablet}}}`;
  if (desktop) css += `@media (min-width:${BP_DESKTOP}px){${sel}{${desktop}}}`;
  return css;
}

/**
 * Build the scoped <style> text for hideOn (per-device visibility): one
 * `display:none` rule per hidden device, each gated by that device's EXACT
 * (non-cascading) viewport range — unlike style/layout's mobile-first overrides,
 * "hide on tablet" must not also hide on desktop. Returns "" when hideOn is unset
 * or empty.
 */
function buildHideOnCss(cls: string, hideOn: Device[] | undefined): string {
  if (!hideOn || hideOn.length === 0) return "";
  const sel = `.${cls}`;
  return hideOn.map((d) => `@media ${HIDE_ON_RANGE[d]}{${sel}{display:none}}`).join("");
}

/**
 * The one block walker — used by the public site and (with editor chrome
 * injected separately) the admin preview.
 *
 * SECURITY: paywall gating happens HERE, at the sibling level, before any
 * later block is rendered or serialized. When the walker meets a paywall the
 * viewer can't pass, it emits the paywall banner, then AT MOST the gate's
 * configured preview-depth count of further siblings (0 by default — the
 * exact historical binary cut), then STOPS: every remaining sibling is never
 * touched, so gated content beyond the preview allowance cannot appear in
 * the HTML or the RSC payload for an unauthorized viewer.
 */
export function RenderBlocks({
  blocks,
  device = "desktop",
  mode = "public",
  viewer = null,
  anchors,
  outline,
  page,
  symbolStack,
  record,
}: {
  blocks: BlockNode[];
  device?: Device;
  mode?: "public" | "editor";
  viewer?: RenderViewer;
  /** Page-unique heading-anchor map (from buildOutline().byBlockId). */
  anchors?: Record<string, string>;
  /** Page heading outline (from buildOutline().headings) — for the TOC block. */
  outline?: OutlineHeadingCtx[];
  /** Current page + ancestor trail — for the breadcrumbs block. */
  page?: PageCtx;
  /** Ids of the symbols currently being expanded up this render branch — the
   *  cycle guard for nested symbols (a symbol can't expand into an ancestor). */
  symbolStack?: string[];
  /** The current repeater record — set by the collection block for its item
   *  template subtree; `{{record.*}}` tokens in descendants resolve against it. */
  record?: Record<string, unknown>;
}): ReactNode {
  const out: ReactNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    // In the editor everything renders (authors must see gated content).
    if (mode === "public" && b.type === "paywall") {
      const parsed = paywallSchema.safeParse(b.content);
      const content = parsed.success ? parsed.data : paywallSchema.parse({});
      const allowance = resolvePaywallPreview(viewer, content);
      if (!allowance.passed) {
        out.push(
          <RenderBlock key={b.id} block={b} device={device} mode={mode} viewer={viewer} anchors={anchors} outline={outline} page={page} symbolStack={symbolStack} record={record} />,
        );
        // Preview allowance (0 by default): reveal up to N more siblings past
        // the wall, then withhold everything after that — the cut line just
        // moves later, it never disappears. Calls RenderBlocks itself (not a
        // raw RenderBlock loop) and SPREADS its result — RenderBlocks always
        // returns a flat ReactNode[], and preserving that flatness (rather
        // than nesting it as one JSX child) keeps the walker's "the returned
        // array's keys are exactly what gets serialized" security property
        // intact, which the gating tests assert on directly. Recursing this
        // way also means a paywall block nested inside this preview window
        // is re-evaluated as a real gate — not rendered as an inert banner —
        // if an author stacked two walls close together with the inner one
        // meant to be stricter.
        const previewSiblings = blocks.slice(i + 1, i + 1 + allowance.previewBlocks);
        out.push(
          ...(RenderBlocks({ blocks: previewSiblings, device, mode, viewer, anchors, outline, page, symbolStack, record }) as ReactNode[]),
        );
        return out;
      }
      // Member passes — drop the banner, keep rendering the rest.
      continue;
    }
    out.push(
      <RenderBlock key={b.id} block={b} device={device} mode={mode} viewer={viewer} anchors={anchors} outline={outline} page={page} symbolStack={symbolStack} record={record} />,
    );
  }
  return out;
}

export async function RenderBlock({
  block,
  device,
  mode,
  viewer,
  anchors,
  outline,
  page,
  symbolStack,
  record,
}: {
  block: BlockNode;
  device: Device;
  mode: "public" | "editor";
  viewer: RenderViewer;
  anchors?: Record<string, string>;
  outline?: OutlineHeadingCtx[];
  page?: PageCtx;
  symbolStack?: string[];
  record?: Record<string, unknown>;
}) {
  const def = blockDef(block.type);
  if (!def) {
    // Unknown block type — e.g. an imported pack references a type this install
    // lacks (or a plugin not loaded). Never crash the page: in the editor show a
    // visible placeholder so the author knows what's missing; on the public site
    // render nothing so visitors see a clean (if incomplete) page.
    if (mode === "editor") {
      return (
        <div data-block={block.type}>
          <UnsupportedBlock type={block.type} />
        </div>
      );
    }
    return null;
  }

  // Graceful degradation: if this block needs an optional dependency the customer
  // removed (e.g. lottie-web), render nothing rather than crash. It's already hidden
  // from the picker (registry.blockAvailable), but a page saved before the dep was
  // removed can still contain one — handle it here too.
  if (def.requiresCapability && !hasCapability(def.requiresCapability)) {
    if (mode === "editor") {
      return (
        <div data-block={block.type}>
          <UnsupportedBlock type={block.type} />
        </div>
      );
    }
    return null;
  }

  const parsed = def.schema.safeParse(block.content);
  if (!parsed.success) {
    // Fail closed: never render a block whose content doesn't validate.
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[blocks] invalid ${block.type} content`, parsed.error.issues[0]);
    }
    return null;
  }
  // Record-field binding: when this block is inside a collection item template, a
  // `record` is in scope — replace `{{record.field}}` tokens in the VALIDATED
  // content (after safeParse, so the token string already passed validation and the
  // substituted value flows to Render without a second validation gate). No token →
  // same object, so non-bound blocks are unaffected. The collection block itself is
  // never substituted (its own render has no record in scope; the record only exists
  // inside its ctx.children subtree).
  const content = (record ? substituteRecordTokens(parsed.data, record) : parsed.data) as Record<
    string,
    unknown
  > & { hideOn?: Device[] };
  // hideOn hidden on EVERY device: never rendered anywhere, so skip entirely
  // rather than ship a permanently-display:none node. A partial hideOn (hidden
  // on some but not all devices) can't be a server-side branch — the page is
  // served on one HTML document for every viewport — so it ships as real CSS
  // (buildHideOnCss below) instead of an early return.
  const ALL_DEVICES = Object.keys(HIDE_ON_RANGE).length;
  if (content.hideOn && new Set(content.hideOn).size >= ALL_DEVICES) return null;

  // Bound blocks resolve on the server; anything failing resolves to null
  // and the block renders its own empty state. Resolvers live in a server-only
  // registry (not on `def`) so the client editor never imports them.
  const resolve = blockResolvers[block.type];
  if (resolve) {
    try {
      content._resolved = await resolve(content);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[blocks] resolve failed for ${block.type}`, err);
      }
      content._resolved = null;
    }
  }

  const ctx = {
    mode,
    device,
    viewer,
    anchors,
    outline,
    page,
    children: (kids: BlockNode[], opts?: { horizontal?: boolean; record?: Record<string, unknown> }) => (
      // A caller-supplied `record` (the collection block, per item) overrides the
      // ambient one for that subtree; otherwise the ambient record threads through.
      <RenderBlocks blocks={kids} device={device} mode={mode} viewer={viewer} anchors={anchors} outline={outline} page={page} symbolStack={symbolStack} record={opts?.record ?? record} />
    ),
  };

  // Stamp the block's page-unique anchor id from the precomputed outline
  // (headings AND anchorId-bearing blocks share one deduped namespace, so two
  // same-text headings — or a section anchorId colliding with a heading slug —
  // still get distinct DOM ids). Generic by block id: no block-type knowledge
  // here; blocks that emit ids read `_anchorId` and fall back to their own
  // bare slug when no map was threaded (editor/standalone renders).
  const anchorId = anchors?.[block.id];
  if (anchorId) (content as { _anchorId?: string })._anchorId = anchorId;

  // Universal style layer (opt-in blocks only; `style` is stripped from others by
  // safeParse above, so this reads the VALIDATED copy) + per-device visibility.
  // Both ship as a per-block scoped <style> with real @media overrides — the
  // served page is one device branch, so responsiveness can't be a ctx.device
  // branch (see buildStyleCss/buildHideOnCss above, and blocks/renderer/style.ts).
  const cls = blockTargetClass(block.id);
  const styleCss = buildStyleCss(cls, (content as { style?: BlockStyle }).style);
  // Raw-value advanced layer — emitted AFTER token style so it overrides. Re-sanitised
  // inside buildAdvancedCss (defence in depth), same gates as customCss.
  const advancedCss = buildAdvancedCss(cls, (content as { advancedStyle?: BlockAdvancedStyle }).advancedStyle);
  const hideOnCss = buildHideOnCss(cls, content.hideOn);

  // Advanced layout layer + raw-CSS escape hatch (layout blocks only; both keys are
  // stripped from non-opted schemas by safeParse above, so this reads VALIDATED
  // copies). customCss is RE-sanitised here (defence in depth — it was already
  // sanitised on save) before landing in a dedicated <style>, AFTER the layout/style
  // <style> so authors can override; its selectors are page-root-scoped by the
  // sanitiser, so the admin (which never carries the scope class) is never affected.
  const layout = (content as { layout?: BlockLayout }).layout;
  const layoutCss = buildLayoutCss(cls, layout);
  const customCss = sanitizeCss((content as { customCss?: string }).customCss ?? "");
  // Motion (entrance animation) — scoped CSS + wrapper data-attrs the client island drives.
  const motion = (content as { motion?: BlockMotion }).motion;
  const motionCss = buildMotionCss(cls, motion);
  const motionDataAttrs = motionAttrs(motion);

  // One shared per-block class for every scoped-CSS source (style/layout/hideOn
  // all target `.pb-<id>`); omitted when none of them emit anything, so a plain
  // block keeps today's exact wrapper — no class, no style prop.
  const scopedCss = styleCss + advancedCss + hideOnCss + layoutCss + motionCss;
  const className = scopedCss ? cls : undefined;

  // Symbol expansion: a `symbol` instance renders its saved DEFINITION tree in
  // place of a normal Render (edit-once-update-all). The instance's own style/
  // hideOn/motion wrapper (computed above) applies to the whole expanded unit;
  // its children flow back through RenderBlocks, so each keeps its own wrapper,
  // resolves its own bound data, and paywall gating still works. Guards: a
  // per-id cycle check + a depth cap, both BEFORE the DB fetch. Missing def /
  // cycle / too-deep degrade to a placeholder (editor) or nothing (public) —
  // the same contract as a missing block type.
  let inner: ReactNode;
  if (block.type === "symbol") {
    const symbolId = String((content as { symbolId?: unknown }).symbolId ?? "");
    const decision = decideExpansion(symbolId, symbolStack);
    if (decision !== "ok") {
      // unset / cycle / too-deep: placeholder in the editor, nothing in public.
      if (mode !== "editor") return null;
      inner = <UnsupportedBlock type={`symbol (${decision})`} />;
    } else {
      const def_ = await loadSymbol(symbolId);
      if (!def_) {
        if (mode !== "editor") return null;
        inner = <UnsupportedBlock type={`missing symbol: ${symbolId}`} />;
      } else {
        const tree = applyOverrides(
          def_.blockTree,
          (content as { overrides?: SymbolOverride[] }).overrides,
        );
        inner = (
          <RenderBlocks
            blocks={tree}
            device={device}
            mode={mode}
            viewer={viewer}
            anchors={anchors}
            outline={outline}
            page={page}
            symbolStack={[...(symbolStack ?? []), symbolId]}
          />
        );
      }
    }
  } else {
    inner = def.Render({ content, ctx });
  }

  return (
    <div data-block={block.type} className={className} {...motionDataAttrs}>
      {/* CSS text as <style> CHILDREN (not dangerouslySetInnerHTML): React does not
          HTML-escape style/script children, and this matches the ThemeStyle idiom.
          style/hideOn/layout CSS is token-only + safe-value filtered; customCss is
          AST-rebuilt by the sanitiser (re-run here — defence in depth) and page-root
          scoped. */}
      {scopedCss ? <style data-block-style="">{scopedCss}</style> : null}
      {customCss ? <style data-custom-css="">{customCss}</style> : null}
      {inner}
    </div>
  );
}

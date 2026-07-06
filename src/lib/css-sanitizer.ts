import postcss, { type ChildNode, type Root, type Rule, type AtRule, type Declaration } from "postcss";

/**
 * The ONLY path author-authored raw CSS may take to a rendered page — the CSS twin
 * of lib/sanitize.ts (which does the same for HTML). This is a SECURITY BOUNDARY:
 * the `customCss` escape hatch on layout blocks lets an author write free-form CSS,
 * so unlike every token-enum control it is NOT safe by construction. Everything
 * dangerous is neutralised here.
 *
 * DEFENCE MODEL — allowlist, rebuild-from-AST, never echo:
 *   1. Parse to an AST with postcss. A parse error (unbalanced braces, garbage)
 *      fails CLOSED — we return "" rather than guess.
 *   2. Walk the AST and REBUILD an allowed subtree: only allow-listed at-rules,
 *      properties, functions, url() targets, and selectors survive; everything
 *      else is dropped. We serialise FROM the rebuilt AST, so the author's raw
 *      bytes are NEVER concatenated into the output — a breakout string that
 *      survived as a value still can't reach the page as markup.
 *   3. SCOPE every authored selector under a page-root marker class
 *      (`.pb-custom-scope`). The user chose full page/site power, so bare
 *      `html`/`body`/`:root`/`*` are REMAPPED to that scope instead of being
 *      allowed to escape — "site-wide" means "within this site's public pages",
 *      NEVER the admin panel (which never carries the scope class).
 *   4. BUDGETS (DoS guard): caps on rule count, selector count, `:has()` count,
 *      and total serialized size; universal-`*` and over-budget `:has()` bombs are
 *      rejected.
 *
 * Callers: sanitised on SAVE (modules/pages/blocks-io) so only the clean string is
 * stored, AND re-sanitised on RENDER (blocks/renderer/BlockRenderer) before it is
 * injected into a dedicated <style data-custom-css> — defence in depth, fail closed.
 */

/** The page-root marker class every authored rule is scoped under. The admin panel
 *  never renders this class, so authored CSS can never touch the editor chrome. */
export const CUSTOM_SCOPE_CLASS = "pb-custom-scope";
const SCOPE = `.${CUSTOM_SCOPE_CLASS}`;

/**
 * The stable per-block target class the renderer emits (`pb-<id>`), sanitised to
 * a DOM/CSS-safe token. cuid2 ids are already [a-z0-9], but imported/legacy ids
 * may not be. Shared so the renderer (which emits it) and the editor's custom-CSS
 * targeting guide (which tells the author to target it) can never drift — if they
 * did, the guide would name a class that matches nothing.
 */
export function blockTargetClass(id: string): string {
  return `pb-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

// ── Budgets (DoS + blast-radius guards) ──────────────────────────────────────
const MAX_INPUT_BYTES = 20000; // matches the schema cap; oversize → reject whole
const MAX_OUTPUT_BYTES = 24000; // serialized budget (scoping adds a little)
const MAX_RULES = 400; // total style rules (across nesting)
const MAX_SELECTORS_PER_RULE = 12; // guards selector-list explosion
const MAX_HAS = 20; // :has() is expensive; cap total occurrences
const MAX_ATRULE_DEPTH = 3; // @media > @supports > rule, etc.

// ── Allowed at-rules. @import/@charset/@namespace/@font-face are NOT here:
//    @import + @charset are stripped (remote fetch / breakout); @font-face is
//    excluded to avoid external url() font loading. @page is excluded (print-only,
//    can't be scoped). Keyframe blocks inside @keyframes carry percentage/keyword
//    "selectors" that are NOT element selectors — handled specially below.
const ALLOWED_ATRULES = new Set(["media", "supports", "container", "keyframes"]);
/** These at-rules contain keyframe steps (`0%`, `from`, `to`) rather than style
 *  rules; their child rules must NOT be selector-scoped. */
const KEYFRAME_ATRULES = new Set(["keyframes"]);

// ── Property allowlist — broad but curated. Unknown props are dropped. No `behavior`,
//    `-moz-binding`, `-o-link`, `expression`-bearing props, etc. (they're simply not
//    on the list). Grouped for readability; membership is all that matters.
const ALLOWED_PROPS = new Set<string>([
  // Box model
  "display", "position", "top", "right", "bottom", "left", "inset", "inset-block", "inset-inline",
  "float", "clear", "box-sizing", "visibility", "overflow", "overflow-x", "overflow-y",
  "width", "min-width", "max-width", "height", "min-height", "max-height",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left", "margin-block", "margin-inline",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left", "padding-block", "padding-inline",
  "aspect-ratio", "object-fit", "object-position",
  // Flex & grid
  "flex", "flex-direction", "flex-wrap", "flex-flow", "flex-grow", "flex-shrink", "flex-basis",
  "justify-content", "justify-items", "justify-self", "align-content", "align-items", "align-self",
  "place-content", "place-items", "place-self", "gap", "row-gap", "column-gap", "order",
  "grid", "grid-template", "grid-template-columns", "grid-template-rows", "grid-template-areas",
  "grid-auto-columns", "grid-auto-rows", "grid-auto-flow",
  "grid-column", "grid-row", "grid-area", "grid-column-start", "grid-column-end", "grid-row-start", "grid-row-end",
  // Typography
  "color", "font", "font-family", "font-size", "font-weight", "font-style", "font-variant",
  "font-stretch", "line-height", "letter-spacing", "word-spacing", "text-align", "text-align-last",
  "text-decoration", "text-decoration-line", "text-decoration-color", "text-decoration-style", "text-decoration-thickness",
  "text-transform", "text-indent", "text-overflow", "text-shadow", "text-underline-offset",
  "white-space", "word-break", "overflow-wrap", "word-wrap", "hyphens", "writing-mode", "direction", "unicode-bidi",
  "vertical-align", "list-style", "list-style-type", "list-style-position", "list-style-image", "tab-size",
  // Background & border
  "background", "background-color", "background-image", "background-position", "background-size",
  "background-repeat", "background-attachment", "background-clip", "background-origin", "background-blend-mode",
  "border", "border-width", "border-style", "border-color", "border-radius",
  "border-top", "border-right", "border-bottom", "border-left",
  "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
  "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
  "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
  "border-top-left-radius", "border-top-right-radius", "border-bottom-left-radius", "border-bottom-right-radius",
  "border-image", "border-image-source", "border-image-slice", "border-image-width", "border-image-outset", "border-image-repeat",
  "border-collapse", "border-spacing", "outline", "outline-width", "outline-style", "outline-color", "outline-offset",
  "box-shadow",
  // Effects / motion
  "opacity", "filter", "backdrop-filter", "mix-blend-mode", "isolation",
  "transform", "transform-origin", "transform-style", "perspective", "perspective-origin", "backface-visibility",
  "transition", "transition-property", "transition-duration", "transition-timing-function", "transition-delay",
  "animation", "animation-name", "animation-duration", "animation-timing-function", "animation-delay",
  "animation-iteration-count", "animation-direction", "animation-fill-mode", "animation-play-state",
  "will-change", "clip-path", "mask", "mask-image", "mask-size", "mask-position", "mask-repeat",
  // Misc safe
  "cursor", "pointer-events", "user-select", "z-index", "content", "quotes", "resize",
  "scroll-behavior", "scroll-margin", "scroll-padding", "scroll-snap-align", "scroll-snap-type",
  "accent-color", "caret-color", "color-scheme", "appearance",
  "columns", "column-count", "column-width", "column-gap", "column-rule", "column-span", "column-fill",
]);

// ── Function allowlist — anything that looks like fn(...) in a value must be one of
//    these. expression()/element()/`-moz-*`/`image-set` w/ remote, etc. are absent →
//    dropped. url() is validated SEPARATELY (see URL policy) rather than by name.
const ALLOWED_FUNCTIONS = new Set<string>([
  "var", "env", "calc", "min", "max", "clamp",
  "rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch", "color", "color-mix",
  "linear-gradient", "radial-gradient", "conic-gradient",
  "repeating-linear-gradient", "repeating-radial-gradient", "repeating-conic-gradient",
  "translate", "translatex", "translatey", "translatez", "translate3d",
  "scale", "scalex", "scaley", "scalez", "scale3d",
  "rotate", "rotatex", "rotatey", "rotatez", "rotate3d",
  "skew", "skewx", "skewy", "matrix", "matrix3d", "perspective",
  "cubic-bezier", "steps", "repeat", "minmax", "fit-content", "attr", "counter", "counters",
  "blur", "brightness", "contrast", "drop-shadow", "grayscale", "hue-rotate",
  "invert", "opacity", "saturate", "sepia",
  "circle", "ellipse", "inset", "polygon", "path", "format", "local",
]);

// ── Regexes ──────────────────────────────────────────────────────────────────
/** Value safe-pattern — a superset of css-vars.ts's SAFE_VALUE_RE, extended for the
 *  broader value grammar raw CSS needs (units, colons in url()/data:, semicolons are
 *  NOT allowed since postcss splits declarations for us). A value failing this is
 *  DROPPED. Deliberately excludes `<`, `>`, `{`, `}`, `\`, `@`, backtick. */
const SAFE_VALUE_RE = /^[#a-zA-Z0-9(),.\s%\-\/_:!"'=+*?&;]+$/;
/** HTML/CSS breakout fragments that must never survive anywhere in the input. */
const BREAKOUT_RE = /<\s*\/?\s*style|<!--|-->|<\s*script|javascript:|vbscript:|expression\s*\(|@import|@charset|behavior\s*:|-moz-binding|<\s*\/?\s*[a-z]/i;
/** url() extractor (handles quotes and whitespace). */
const URL_RE = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi;
/** Any fn(  — used to enumerate function names present in a value. */
const FN_RE = /([a-zA-Z_][a-zA-Z0-9_-]*)\s*\(/g;

/** A url() target is allowed only if it is a data:image/* URI or a same-origin
 *  absolute path ("/..."). Everything else — javascript:, vbscript:, data:text/html,
 *  http(s):// external, protocol-relative // — is rejected. */
function isAllowedUrl(raw: string): boolean {
  const u = raw.trim().replace(/^["']|["']$/g, "").trim();
  if (u === "") return false;
  const lower = u.toLowerCase();
  if (lower.startsWith("data:image/")) {
    // Block the data:image/svg+xml vector (SVG can carry scripts). Raster only.
    return !lower.startsWith("data:image/svg");
  }
  // Same-origin absolute path, but NOT protocol-relative "//host".
  if (u.startsWith("/") && !u.startsWith("//")) return true;
  return false;
}

/** True when a value string is safe to emit: passes the char whitelist, every
 *  function in it is allow-listed, and every url() points somewhere allowed. */
function isSafeValue(value: string): boolean {
  if (!value) return false;
  if (BREAKOUT_RE.test(value)) return false;
  if (!SAFE_VALUE_RE.test(value)) return false;

  // Every url() target must pass the URL policy.
  URL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = URL_RE.exec(value)) !== null) {
    const target = m[1] ?? m[2] ?? m[3] ?? "";
    if (!isAllowedUrl(target)) return false;
  }

  // Every fn( name must be on the function allowlist. `url` is validated above, so
  // it's permitted here; a bare identifier followed by "(" that isn't allow-listed
  // (e.g. expression, image-set, -moz-*) fails.
  FN_RE.lastIndex = 0;
  while ((m = FN_RE.exec(value)) !== null) {
    const fn = m[1].toLowerCase();
    if (fn === "url") continue;
    if (!ALLOWED_FUNCTIONS.has(fn)) return false;
  }
  return true;
}

/**
 * Split a selector list on its TOP-LEVEL commas only — commas inside `()`
 * (`:is(.a, .b)`, `:not(...)`) or `[]` (`[data-x="1,2"]`) belong to a single
 * complex selector and must not be split, or scoping would corrupt them (each
 * fragment re-prefixed, so the selector matches nothing). A plain
 * `split(",")` cannot tell the two apart. String literals inside `[]` are
 * respected so a quoted `)`/`]`/`,` doesn't skew the depth.
 */
function splitTopLevelCommas(input: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: '"' | "'" | null = null;
  let start = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quote) {
      if (c === quote && input[i - 1] !== "\\") quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth = Math.max(0, depth - 1);
    else if (c === "," && depth === 0) {
      out.push(input.slice(start, i));
      start = i + 1;
    }
  }
  out.push(input.slice(start));
  return out;
}

/**
 * Scope + sanitise a single selector list. Returns a safe, scoped selector, or
 * null if the whole rule should be dropped. Policy:
 *  - Split on top-level commas; cap the count (MAX_SELECTORS_PER_RULE).
 *  - Reject a bare universal `*` (and `* *`, ` > *` etc. whose ONLY meaningful
 *    token is universal) — a page-wide `* { }` bomb.
 *  - Remap a leading `html`/`body`/`:root` to the scope root (so "site-wide" is the
 *    site's pages, not the admin).
 *  - Otherwise PREFIX every selector with `${SCOPE} ` (descendant) so it can only
 *    ever match inside a scoped page.
 *  - Reject selectors carrying breakout chars or `{`/`}`/`@`.
 */
function scopeSelector(selectorList: string, hasCounter: { n: number }): string | null {
  const parts = splitTopLevelCommas(selectorList).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0 || parts.length > MAX_SELECTORS_PER_RULE) return null;

  const out: string[] = [];
  for (const part of parts) {
    if (/[<>{}@\\]/.test(part)) return null; // structural breakout chars
    if (part.includes("</") ) return null;

    // Count :has() toward the budget.
    const has = part.match(/:has\(/gi);
    if (has) hasCounter.n += has.length;

    // Strip a leading, author-supplied scope class first — the targeting guide
    // SHOWS authors `.pb-custom-scope .foo { … }`, so copying it verbatim must
    // not double-scope into `.pb-custom-scope .pb-custom-scope .foo` (which
    // matches nothing). We add exactly one scope prefix below.
    let s = part.replace(new RegExp(`^\\s*\\.${CUSTOM_SCOPE_CLASS}\\b\\s*`), "").trim();

    // Strip a leading html/body/:root so it maps onto the scope root rather than
    // escaping it. Applied token-by-token at the START of the selector only.
    s = s
      .replace(/^\s*html\b\s*/i, "")
      .replace(/^\s*:root\b\s*/i, "")
      .replace(/^\s*body\b\s*/i, "")
      .trim();

    // If html/body/:root was the WHOLE selector, it now maps onto the scope root.
    if (s === "") {
      out.push(SCOPE);
      continue;
    }

    // A selector whose only remaining token is universal (`*`, `* *`, `*>*`) is a
    // page-wide bomb — REJECT the whole rule rather than scope it. (A universal that
    // is QUALIFIED, e.g. `.card *`, is fine and kept.)
    const nonUniversal = s.replace(/[\s>+~*]/g, "");
    if (nonUniversal === "") return null;

    out.push(`${SCOPE} ${s}`);
  }
  return out.join(", ");
}

type Budget = { rules: number; has: { n: number } };

/** Rebuild an allowed COPY of a declaration, or null to drop it. */
function cleanDecl(decl: Declaration): Declaration | null {
  const prop = decl.prop.trim().toLowerCase();
  // Custom properties (--x) are allowed but their value must still be safe (a var
  // can be consumed by an allowed property later; the value gate still applies).
  const isCustomProp = prop.startsWith("--");
  if (!isCustomProp && !ALLOWED_PROPS.has(prop)) return null;
  if (prop.includes("<") || prop.includes(">")) return null;

  const value = decl.value.trim();
  if (!isSafeValue(value)) return null;
  // `!important` arrives as decl.important in postcss; keep it but it's already
  // covered by the value gate not seeing "!important" (it's a separate field).
  const clone = decl.clone();
  clone.prop = prop;
  clone.value = value;
  return clone;
}

/** Max property→value pairs kept in one advanced-style layer (blast-radius guard,
 *  mirrors the customCss rule cap in spirit). */
const MAX_ADVANCED_DECLS = 40;

/**
 * Sanitise the RAW-VALUE ("advanced") style bucket — a `{ property: value }` map an
 * author types directly (px/hex/any allow-listed property), the escape hatch that
 * complements the token-enum controls. It reuses the EXACT same gates as the customCss
 * hatch — `ALLOWED_PROPS` (or a `--custom-prop`) + `isSafeValue` (which already permits
 * px/em/rem/hex and rejects `</style>`, `javascript:`, external url(), unknown fns) —
 * so the raw bucket widens author flexibility WITHOUT widening the attack surface: no
 * new value grammar, same allowlist. Returns a fresh cleaned map (dropping every unsafe
 * or unknown pair); never throws. Applied on SAVE and re-applied on RENDER, like customCss.
 */
export function sanitizeAdvancedDecls(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, string> = {};
  let kept = 0;
  for (const [rawProp, rawVal] of Object.entries(input as Record<string, unknown>)) {
    if (kept >= MAX_ADVANCED_DECLS) break;
    if (typeof rawVal !== "string") continue;
    const prop = rawProp.trim().toLowerCase();
    if (!prop) continue;
    const isCustomProp = prop.startsWith("--");
    if (!isCustomProp && !ALLOWED_PROPS.has(prop)) continue;
    if (prop.includes("<") || prop.includes(">")) continue;
    const value = rawVal.trim();
    if (!value || !isSafeValue(value)) continue;
    out[prop] = value;
    kept++;
  }
  return out;
}

/** Rebuild an allowed COPY of a rule (selector-scoped), or null to drop it. */
function cleanRule(rule: Rule, budget: Budget, scope: boolean): Rule | null {
  if (++budget.rules > MAX_RULES) return null;

  const clone = rule.clone();
  clone.removeAll();

  if (scope) {
    const scoped = scopeSelector(rule.selector, budget.has);
    if (scoped === null) return null;
    if (budget.has.n > MAX_HAS) return null;
    clone.selector = scoped;
  } else {
    // Keyframe step selector (`0%`, `from`, `to`, `50%,60%`). Allow only these shapes.
    const sel = rule.selector.trim();
    if (!/^(from|to|-?\d+(\.\d+)?%|(\s|,)|(from|to|-?\d+(\.\d+)?%))+$/i.test(sel)) return null;
    if (/[<>{}@\\]/.test(sel)) return null;
    clone.selector = sel;
  }

  for (const child of rule.nodes ?? []) {
    if (child.type === "decl") {
      const d = cleanDecl(child);
      if (d) clone.append(d);
    }
    // Nested rules/at-rules inside a style rule are dropped (kept simple/flat);
    // authors can use top-level @media instead.
  }
  // Drop rules that ended up empty (all declarations filtered out).
  return clone.nodes && clone.nodes.length > 0 ? clone : null;
}

/** Rebuild an allowed COPY of an at-rule, or null to drop it. `depth` bounds nesting. */
function cleanAtRule(at: AtRule, budget: Budget, depth: number): AtRule | null {
  const name = at.name.trim().toLowerCase();
  if (!ALLOWED_ATRULES.has(name)) return null;
  if (depth > MAX_ATRULE_DEPTH) return null;

  // The at-rule PARAMS (e.g. the media query) must be free of breakout chars. We do
  // NOT reinterpret them beyond that; postcss already parsed the condition grammar.
  const params = at.params ?? "";
  if (/[<>{}\\]/.test(params) || params.includes("</") || /url\s*\(/i.test(params)) return null;
  if (BREAKOUT_RE.test(`@${name} ${params}`)) return null;

  const clone = at.clone();
  clone.removeAll();
  clone.name = name;
  clone.params = params.trim();
  // postcss keeps a prelude comment in raws.afterName (and the pre-block
  // whitespace/comment in raws.between), which clone() preserves and re-emits
  // verbatim — the one place author bytes could survive into the output. The
  // params check above never sees those bytes. Normalise the raws so only the
  // sanitised name + params reach the serializer, upholding the never-echo
  // invariant (a prelude `/* } .evil{} */` is otherwise passed through).
  clone.raws.afterName = " ";
  clone.raws.between = " ";

  const isKeyframes = KEYFRAME_ATRULES.has(name);
  for (const child of at.nodes ?? []) {
    const kept = cleanNode(child, budget, depth + 1, /* scope */ !isKeyframes);
    if (kept) clone.append(kept);
  }
  return clone.nodes && clone.nodes.length > 0 ? clone : null;
}

/** Dispatch one child node to the right cleaner. Comments are dropped. */
function cleanNode(node: ChildNode, budget: Budget, depth: number, scope: boolean): ChildNode | null {
  if (node.type === "rule") return cleanRule(node, budget, scope);
  if (node.type === "atrule") return cleanAtRule(node, budget, depth);
  // decl at top level (invalid CSS) and comments are dropped.
  return null;
}

/**
 * Sanitise author CSS. Returns a safe, page-scoped CSS string, or "" on total
 * failure (parse error, empty, or oversize). NEVER throws — fail closed.
 */
export function sanitizeCss(input: string): string {
  if (typeof input !== "string") return "";
  const src = input.trim();
  if (src === "") return "";
  if (src.length > MAX_INPUT_BYTES) return "";
  // Fast structural reject: obvious breakout fragments anywhere in the raw input.
  if (/<\s*\/?\s*style|<!--|-->|<\s*script|@charset|@import\b/i.test(src)) return "";

  let root: Root;
  try {
    root = postcss.parse(src);
  } catch {
    return ""; // unbalanced braces / garbage → fail closed
  }

  const budget: Budget = { rules: 0, has: { n: 0 } };
  const rebuilt = postcss.root();
  for (const node of root.nodes) {
    const kept = cleanNode(node as ChildNode, budget, 1, /* scope */ true);
    if (kept) rebuilt.append(kept);
  }

  if (rebuilt.nodes.length === 0) return "";

  // Serialise FROM the rebuilt AST — the author's raw bytes never reach output.
  let css = rebuilt.toString();

  // Final belt-and-braces: a serialized breakout or over-budget output is rejected
  // wholesale rather than partially emitted.
  if (BREAKOUT_RE.test(css) || css.length > MAX_OUTPUT_BYTES) return "";
  // Collapse the pretty-printer's newlines to keep the injected <style> compact.
  css = css.replace(/\s*\n\s*/g, " ").trim();
  return css;
}

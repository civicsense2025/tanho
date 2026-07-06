/**
 * Split an HTML string into chunks no longer than `maxChars`, cutting ONLY
 * between top-level elements — never inside a tag or a nested element.
 * Ghost's post `html` is a flat sequence of top-level block elements (`<p>`,
 * `<h2>`, `<figure>`, ...), so tracking nesting depth via open/close tag
 * counts is enough to find safe cut points without a full HTML parser.
 *
 * Exists so a post whose body exceeds richtextSchema's per-block cap can be
 * imported as multiple sequential richtext blocks instead of being rejected
 * outright — see modules/importers/ghost/map.ts's mapGhostPost.
 */

/** Void/self-closing elements that never have a matching close tag — an
 *  open-tag count for these must not increment nesting depth. */
const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;

/**
 * Walk the string once, tracking element-nesting depth. Returns every index
 * where depth returns to 0 right after a closing (or self-closing/void)
 * tag — i.e. every point between two top-level elements, safe to cut at.
 */
export function topLevelBoundaries(html: string): number[] {
  const boundaries: number[] = [];
  let depth = 0;
  TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_RE.exec(html)) !== null) {
    const isClosing = match[0].startsWith("</");
    const tagName = match[1]!.toLowerCase();
    const isSelfClosing = match[2] === "/" || VOID_ELEMENTS.has(tagName);

    if (isClosing) {
      depth = Math.max(0, depth - 1);
    } else if (!isSelfClosing) {
      depth++;
    }
    // else: a void/self-closing open tag — doesn't change depth.

    if (depth === 0) {
      boundaries.push(match.index + match[0].length);
    }
  }
  return boundaries;
}

/**
 * Split `html` into its individual top-level elements (one per element, not
 * size-batched) — e.g. a post's `<figure>...</figure><p>...</p>` becomes
 * `["<figure>...</figure>", "<p>...</p>"]`. Used to inspect each top-level
 * element independently for a recognizable Ghost card (see card-detect.ts)
 * before falling back to bundling runs of plain content into richtext
 * blocks. Falls back to the whole string as one element if no safe boundary
 * exists (matching chunkHtmlAtTopLevelBoundaries's own fallback).
 */
export function splitIntoTopLevelElements(html: string): string[] {
  const boundaries = topLevelBoundaries(html);
  if (boundaries.length === 0) return html ? [html] : [];
  const elements: string[] = [];
  let start = 0;
  for (const boundary of boundaries) {
    elements.push(html.slice(start, boundary));
    start = boundary;
  }
  if (start < html.length) elements.push(html.slice(start));
  return elements;
}

/** Generic wrapper elements an export may nest an entire post body inside
 *  (Substack's `<div class="body markup">`, some Medium/Ghost variants) — they
 *  carry no semantics of their own, so descending through them exposes the real
 *  content elements (figures/images/embeds) to per-element card detection. */
const UNWRAP_CONTAINERS = new Set(["div", "section", "article", "main"]);

/**
 * If `html` is a SINGLE top-level generic container that wraps the whole body
 * (e.g. `<div class="body markup">…all the content…</div>`), return its inner
 * HTML so the real content elements become top-level — repeating while the
 * result is still a lone wrapper (handles `<div><div>…</div></div>` nesting, up
 * to a small bound). Returns `html` unchanged when the top level is already a
 * sequence of elements, or the lone element isn't a generic container (a lone
 * `<figure>`/`<img>`/`<p>` is real content, not a wrapper, and is kept).
 *
 * Deliberately conservative: it only unwraps when there is EXACTLY one top-level
 * element, so a normal multi-element body is never altered.
 */
export function unwrapContainers(html: string, maxDepth = 4): string {
  let current = html.trim();
  for (let i = 0; i < maxDepth; i++) {
    const elements = splitIntoTopLevelElements(current);
    if (elements.length !== 1) return current; // already a sequence — done
    const only = elements[0]!.trim();
    const openMatch = /^<([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/.exec(only);
    if (!openMatch) return current;
    const tag = openMatch[1]!.toLowerCase();
    if (!UNWRAP_CONTAINERS.has(tag)) return current; // lone real element — keep
    // Strip the outer <tag ...> … </tag> to expose the children.
    const closeRe = new RegExp(`</${tag}\\s*>\\s*$`, "i");
    if (!closeRe.test(only)) return current; // not a clean wrapper — keep
    const inner = only.replace(openMatch[0], "").replace(closeRe, "").trim();
    if (!inner) return current; // empty wrapper — keep as-is
    current = inner;
  }
  return current;
}

/**
 * Split `html` into chunks of at most `maxChars`, only at a top-level
 * element boundary. A single element larger than `maxChars` on its own
 * (e.g. one enormous `<pre>` block) is kept whole rather than corrupted —
 * that one chunk exceeds `maxChars`, which is the honest tradeoff (never
 * emit invalid HTML) over the alternative (silently truncating markup).
 */
export function chunkHtmlAtTopLevelBoundaries(html: string, maxChars: number): string[] {
  if (html.length <= maxChars) return [html];

  const boundaries = topLevelBoundaries(html);
  if (boundaries.length === 0) return [html]; // no safe cut point found — keep whole

  const chunks: string[] = [];
  let chunkStart = 0;
  let lastBoundaryInChunk = 0;

  for (const boundary of boundaries) {
    if (boundary - chunkStart > maxChars && lastBoundaryInChunk > chunkStart) {
      chunks.push(html.slice(chunkStart, lastBoundaryInChunk));
      chunkStart = lastBoundaryInChunk;
    }
    lastBoundaryInChunk = boundary;
  }
  chunks.push(html.slice(chunkStart));
  return chunks;
}

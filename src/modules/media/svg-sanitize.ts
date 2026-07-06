import DOMPurify from "isomorphic-dompurify";

/**
 * Server-side SVG sanitizer for uploaded logos/favicons.
 *
 * SVG is XML that can carry active content — inline <script>, event handlers
 * (onload/onclick/…), <foreignObject> (arbitrary HTML), external references
 * (<use href>, xlink:href, external stylesheets/images), and `javascript:`
 * URLs. We accept SVG only after reducing it to a safe, presentational subset
 * here, BEFORE it is written to storage (see media/actions.ts). Logos are then
 * rendered exclusively via `<img src>` / `<link rel=icon>`, which do not
 * execute embedded script even if something slipped through — sanitization is
 * the primary control, `<img>` rendering + serve headers are defense in depth.
 *
 * Uses DOMPurify (via jsdom under isomorphic-dompurify). Keep jsdom current:
 * older jsdom releases have known XSS vectors independent of DOMPurify.
 */

/** Reject pathological inputs before parsing (decompression/DoS guard). */
const MAX_SVG_BYTES = 512 * 1024; // 512KB — a logo is tiny; this is generous.
const MAX_SVG_ELEMENTS = 4000;

const PURIFY_CONFIG = {
  USE_PROFILES: { svg: true, svgFilters: true },
  // Belt-and-suspenders on top of the SVG profile's own allowlist. `style` is
  // forbidden because DOMPurify does not sanitize CSS *inside* a <style> body,
  // so `@import url(...)`/`url(...)` beacons would otherwise survive — a logo
  // needs only presentation attributes, never a stylesheet.
  FORBID_TAGS: ["script", "style", "foreignObject", "a", "use", "image", "audio", "video"],
  FORBID_ATTR: ["href", "xlink:href"],
  // Return a string; keep the <svg> root element.
  WHOLE_DOCUMENT: false,
};

/**
 * Returns a sanitized SVG string, or null if the input isn't a usable SVG
 * (empty, too large, too many elements, or nothing survived sanitization).
 */
export function sanitizeSvg(input: string): string | null {
  if (!input) return null;
  if (Buffer.byteLength(input, "utf8") > MAX_SVG_BYTES) return null;

  // Cheap element-count ceiling before handing to the parser.
  const openTags = (input.match(/</g) ?? []).length;
  if (openTags > MAX_SVG_ELEMENTS) return null;

  const clean = DOMPurify.sanitize(input, PURIFY_CONFIG).trim();
  if (!clean) return null;

  // Must reduce to a single <svg> root — reject fragments or stripped-to-empty
  // results that would render as a broken/blank asset.
  if (!/^<svg[\s>]/i.test(clean) || !/<\/svg>\s*$/i.test(clean)) return null;

  return clean;
}

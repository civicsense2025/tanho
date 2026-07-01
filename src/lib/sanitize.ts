import DOMPurify from "isomorphic-dompurify";

/** Tags this site's admin-authored content actually produces -- guide/step/callout
 * HTML and project body HTML are hand-authored as raw HTML in plain <textarea>
 * fields (see TextEditor, GuideForm's summary field), no markdown pipeline or
 * rich-text editor in between. Kept intentionally close to what's really used
 * (headings, paragraphs, links, images, lists, emphasis, code, tables) rather
 * than DOMPurify's much larger default allowlist. */
const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4",
  "p", "br", "hr",
  "a",
  "img",
  "ul", "ol", "li",
  "strong", "b", "em", "i", "u", "s",
  "code", "pre",
  "blockquote",
  "table", "thead", "tbody", "tr", "th", "td",
  "span", "div",
];

const ALLOWED_ATTR = ["href", "target", "rel", "src", "alt", "width", "height", "title"];

/** Sanitizes admin-authored HTML before it's passed to dangerouslySetInnerHTML.
 * Works both server-side (Server Components, via jsdom under the hood) and
 * client-side (browser DOM) -- isomorphic-dompurify picks the right backend
 * automatically, so this one helper is safe to call from either. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}

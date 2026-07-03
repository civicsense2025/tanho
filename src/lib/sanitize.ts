import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/**
 * The ONLY path author HTML may take to a page. Strict allowlist; every
 * rich-text block sanitizes through here server-side at render time.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "h2", "h3", "h4", "br", "hr",
    "strong", "em", "b", "i", "u", "s", "mark",
    "a", "ul", "ol", "li", "blockquote",
    "code", "pre", "img", "figure", "figcaption",
  ],
  allowedAttributes: {
    a: ["href", "title"],
    img: ["src", "alt", "title", "width", "height"],
  },
  allowedSchemes: ["https", "http", "mailto"],
  allowedSchemesAppliedToAttributes: ["href", "src"],
  // Relative URLs (in-site links, media library paths) stay allowed.
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
  },
};

export function sanitizeRichHtml(html: string): string {
  return sanitizeHtml(html ?? "", OPTIONS);
}

/** Markdown → sanitized HTML (the richtext block's md mode). */
export function markdownToSafeHtml(md: string): string {
  const raw = marked.parse(md ?? "", { async: false }) as string;
  return sanitizeRichHtml(raw);
}

/** For JSON-LD script tags: prevent </script> breakout. */
export function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

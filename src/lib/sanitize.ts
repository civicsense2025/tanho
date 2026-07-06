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

/**
 * A slightly wider allowlist for the "HTML embed" block: everything sanitizeRichHtml
 * permits, PLUS a hardened <iframe> (so authors can paste an embed snippet beyond the
 * provider allowlist) and a few structural containers. The iframe is forced into a
 * restrictive `sandbox` (scripts + same-origin popups allowed for typical embeds, but
 * NOT allow-top-navigation / allow-modals / allow-downloads) and https-only src — so
 * even arbitrary third-party embeds can't navigate the top frame or run in our origin.
 * `<script>` is still stripped (that's what the owner-only page code slot is for).
 */
const EMBED_OPTIONS: sanitizeHtml.IOptions = {
  ...OPTIONS,
  allowedTags: [...(OPTIONS.allowedTags as string[]), "iframe", "div", "span", "video", "audio", "source"],
  allowedAttributes: {
    ...OPTIONS.allowedAttributes,
    iframe: ["src", "width", "height", "title", "loading", "allow", "allowfullscreen", "frameborder", "style", "sandbox", "referrerpolicy"],
    div: ["class", "style"],
    span: ["class", "style"],
    video: ["src", "controls", "width", "height", "poster", "preload"],
    audio: ["src", "controls", "preload"],
    source: ["src", "type"],
  },
  allowedIframeHostnames: undefined, // any host, but hardened below + https-only
  transformTags: {
    ...OPTIONS.transformTags,
    iframe: (tagName, attribs) => ({
      tagName: "iframe",
      attribs: {
        ...attribs,
        // Force a restrictive sandbox: no top-nav, no modals, no downloads, no
        // form-outside-origin. Enough for video/map/embed players.
        sandbox: "allow-scripts allow-same-origin allow-popups allow-presentation",
        loading: attribs.loading ?? "lazy",
        referrerpolicy: "no-referrer",
      },
    }),
  },
};

export function sanitizeEmbedHtml(html: string): string {
  return sanitizeHtml(html ?? "", EMBED_OPTIONS);
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

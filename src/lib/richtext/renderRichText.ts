import { sanitizeHtml } from "@/lib/sanitize";

/** Canonical render function for rich-text content, wherever it's stored (a `richtext` block's
 * `content.html`, a post body, a future content-entry `richtext` field). Storage is already
 * sanitized-HTML-shaped, so rendering is just re-sanitizing at the trust boundary -- the same
 * treatment for TipTap's own output and the HTML-mode textarea's freeform input, since both are
 * "a string that claims to be HTML" from this function's point of view. */
export function renderRichText(html: string): string {
  return sanitizeHtml(html || "");
}

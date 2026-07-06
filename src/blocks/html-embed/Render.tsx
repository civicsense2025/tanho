import { sanitizeEmbedHtml } from "@/lib/sanitize";
import type { RenderCtx } from "../types";
import type { HtmlEmbedContent } from "./fields";

/**
 * Paste-any-embed block — the escape hatch beyond the provider-allowlisted `embed`
 * block. The HTML is sanitised on render via `sanitizeEmbedHtml`: rich tags plus a
 * HARDENED, sandboxed, https-only <iframe> survive; <script> and unsafe attributes are
 * stripped. Empty renders nothing. (For real <script>, the owner-only page code slot.)
 */
export function RenderHtmlEmbed({ content }: { content: HtmlEmbedContent; ctx: RenderCtx }) {
  const html = content.html ? sanitizeEmbedHtml(content.html) : "";
  if (!html) return null;
  return <div data-html-embed="" dangerouslySetInnerHTML={{ __html: html }} />;
}

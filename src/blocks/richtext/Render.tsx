import { markdownToSafeHtml, sanitizeRichHtml } from "@/lib/sanitize";
import type { RenderCtx } from "../types";
import type { RichtextContent } from "./fields";

/**
 * The ONLY block that uses dangerouslySetInnerHTML — and only with output
 * of the strict allowlist sanitizer in src/lib/sanitize.ts.
 */
export function RenderRichtext({ content }: { content: RichtextContent; ctx: RenderCtx }) {
  const html = content.html
    ? sanitizeRichHtml(content.html)
    : markdownToSafeHtml(content.md);
  return <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />;
}

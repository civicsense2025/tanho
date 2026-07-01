import type { TextBlockContent } from "../types";
import { sanitizeHtml } from "@/lib/sanitize";

export function TextRenderer({ content }: { content: TextBlockContent }) {
  return <div className="prose" dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.html || "") }} />;
}

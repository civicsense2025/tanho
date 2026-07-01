import type { TextBlockContent } from "../types";

export function TextRenderer({ content }: { content: TextBlockContent }) {
  return <div className="prose" dangerouslySetInnerHTML={{ __html: content.html || "" }} />;
}

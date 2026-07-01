import type { RichtextBlockContent } from "../types";
import { renderRichText } from "@/lib/richtext/renderRichText";

export function RichTextRenderer({ content }: { content: RichtextBlockContent }) {
  return <div className="prose" dangerouslySetInnerHTML={{ __html: renderRichText(content.html || "") }} />;
}

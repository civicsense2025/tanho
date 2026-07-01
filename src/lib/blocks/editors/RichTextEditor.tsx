"use client";

import { RichTextEditor as Editor } from "@/lib/richtext/RichTextEditor";
import type { RichtextBlockContent } from "../types";

export function RichTextEditor({
  content,
  onChange,
  onUpload,
}: {
  content: RichtextBlockContent;
  onChange: (c: RichtextBlockContent) => void;
  onUpload: (f: File) => Promise<string>;
}) {
  return <Editor value={content.html || ""} onChange={(html) => onChange({ html })} onUpload={onUpload} />;
}

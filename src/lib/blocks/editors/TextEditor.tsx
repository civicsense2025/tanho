"use client";

import { Textarea } from "@/components/ui";
import type { TextBlockContent } from "../types";

export function TextEditor({ content, onChange }: { content: TextBlockContent; onChange: (c: TextBlockContent) => void }) {
  return (
    <Textarea mono rows={6} value={content.html || ""} onChange={(e) => onChange({ html: e.target.value })} placeholder="<p>Content HTML…</p>" />
  );
}

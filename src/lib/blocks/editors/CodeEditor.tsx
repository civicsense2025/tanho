"use client";

import { Input, Textarea } from "@/components/ui";
import type { CodeBlockContent } from "../types";

export function CodeEditor({ content, onChange }: { content: CodeBlockContent; onChange: (c: CodeBlockContent) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <Input value={content.filename || ""} onChange={(e) => onChange({ ...content, filename: e.target.value })} placeholder="Filename (optional)" />
      <Textarea mono rows={8} value={content.code || ""} onChange={(e) => onChange({ ...content, code: e.target.value })} placeholder="const example = true;" />
    </div>
  );
}

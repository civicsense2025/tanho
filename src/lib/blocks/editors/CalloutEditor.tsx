"use client";

import { Select, Textarea } from "@/components/ui";
import type { CalloutBlockContent } from "../types";

export function CalloutEditor({ content, onChange }: { content: CalloutBlockContent; onChange: (c: CalloutBlockContent) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <Select
        value={content.variant || "default"}
        onChange={(e) => onChange({ ...content, variant: e.target.value as CalloutBlockContent["variant"] })}
      >
        <option value="default">Default</option>
        <option value="warning">Warning</option>
        <option value="danger">Danger</option>
      </Select>
      <Textarea mono rows={4} value={content.html || ""} onChange={(e) => onChange({ ...content, html: e.target.value })} placeholder="<p>Callout HTML…</p>" />
    </div>
  );
}

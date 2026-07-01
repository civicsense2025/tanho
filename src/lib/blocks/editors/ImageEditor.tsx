"use client";

import { useState } from "react";
import { Input } from "@/components/ui";
import type { ImageBlockContent } from "../types";

export function ImageEditor({
  content,
  onChange,
  onUpload,
}: {
  content: ImageBlockContent;
  onChange: (c: ImageBlockContent) => void;
  onUpload: (f: File) => Promise<string>;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    onChange({ ...content, url: await onUpload(file) });
    setUploading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {!!content.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={content.url} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }} />
      )}
      <input type="file" accept="image/*" onChange={handleFileUpload} style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }} />
      {uploading && <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Uploading…</p>}
      <Input value={content.url || ""} onChange={(e) => onChange({ ...content, url: e.target.value })} placeholder="Or paste URL" />
      <Input value={content.caption || ""} onChange={(e) => onChange({ ...content, caption: e.target.value })} placeholder="Caption (optional)" />
    </div>
  );
}

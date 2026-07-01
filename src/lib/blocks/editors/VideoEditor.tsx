"use client";

import { useState } from "react";
import { Input } from "@/components/ui";
import type { VideoBlockContent } from "../types";

export function VideoEditor({
  content,
  onChange,
  onUpload,
}: {
  content: VideoBlockContent;
  onChange: (c: VideoBlockContent) => void;
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
      {!!content.url && <video src={content.url} controls style={{ width: "100%", borderRadius: "var(--radius-sm)" }} />}
      <input type="file" accept="video/*" onChange={handleFileUpload} style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }} />
      {uploading && <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Uploading…</p>}
      <Input value={content.url || ""} onChange={(e) => onChange({ ...content, url: e.target.value })} placeholder="Or paste URL" />
      <Input value={content.caption || ""} onChange={(e) => onChange({ ...content, caption: e.target.value })} placeholder="Caption (optional)" />
      <Input value={content.poster || ""} onChange={(e) => onChange({ ...content, poster: e.target.value })} placeholder="Poster image URL (optional)" />
    </div>
  );
}

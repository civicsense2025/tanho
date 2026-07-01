"use client";

import { useState } from "react";
import type { GalleryBlockContent } from "../types";

export function GalleryEditor({
  content,
  onChange,
  onUpload,
}: {
  content: GalleryBlockContent;
  onChange: (c: GalleryBlockContent) => void;
  onUpload: (f: File) => Promise<string>;
}) {
  const [uploading, setUploading] = useState(false);
  const images = content.images || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-2)" }}>
        {images.map((img, i) => (
          <div key={i} style={{ position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }} />
            <button
              type="button"
              onClick={() => onChange({ images: images.filter((_, j) => j !== i) })}
              style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "var(--text-xs)", border: "none", borderRadius: "var(--radius-xs)", padding: "0 5px", cursor: "pointer" }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={async (e) => {
          const files = Array.from(e.target.files || []);
          setUploading(true);
          const urls = await Promise.all(files.map(onUpload));
          onChange({ images: [...images, ...urls.map((url) => ({ url }))] });
          setUploading(false);
        }}
        style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
      />
      {uploading && <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Uploading…</p>}
    </div>
  );
}

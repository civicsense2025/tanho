import Image from "next/image";
import type { GalleryBlockContent } from "../types";

export function GalleryRenderer({ content }: { content: GalleryBlockContent }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--space-2)" }}>
      {content.images.map((img, i) => (
        <figure key={i} style={{ margin: 0 }}>
          <div style={{ position: "relative", aspectRatio: "1 / 1", overflow: "hidden", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }}>
            <Image src={img.url} alt={img.caption || ""} fill style={{ objectFit: "cover" }} />
          </div>
          {img.caption && <figcaption style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", marginTop: "var(--space-1)" }}>{img.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

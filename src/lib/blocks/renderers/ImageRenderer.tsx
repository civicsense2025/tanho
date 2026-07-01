import Image from "next/image";
import type { ImageBlockContent } from "../types";

export function ImageRenderer({ content }: { content: ImageBlockContent }) {
  return (
    <figure style={{ margin: 0 }}>
      <div style={{ position: "relative", overflow: "hidden", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }}>
        <Image src={content.url} alt={content.caption || ""} width={900} height={600} style={{ width: "100%", height: "auto" }} />
      </div>
      {content.caption && (
        <figcaption style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", marginTop: "var(--space-2)", textAlign: "center" }}>{content.caption}</figcaption>
      )}
    </figure>
  );
}

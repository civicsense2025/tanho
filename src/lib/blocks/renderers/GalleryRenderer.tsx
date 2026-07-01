import Image from "next/image";
import type { GalleryBlockContent } from "../types";

/** Column count resolution: an explicit style.columns wins, else the variant (grid-N), else
 * the historical default of 2 — so an unstyled gallery renders exactly as before
 * (repeat(2, 1fr)). Column choice is now data-driven rather than hardcoded. */
function resolveColumns(variant?: string, columns?: number): number {
  if (columns) return columns;
  if (variant === "grid-3") return 3;
  if (variant === "grid-4") return 4;
  return 2; // grid-2 / unset
}

export function GalleryRenderer({
  content,
  variant,
  columns,
}: {
  content: GalleryBlockContent;
  variant?: string;
  columns?: number;
}) {
  const cols = resolveColumns(variant, columns);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: "var(--space-2)",
      }}
    >
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

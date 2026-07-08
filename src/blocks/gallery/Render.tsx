import type { RenderCtx } from "../types";
import { MediaPlaceholder } from "../image/Placeholder";
import type { GalleryContent } from "./fields";

/** Square-tile image grid; caps at two columns below desktop. */
export function RenderGallery({ content, ctx }: { content: GalleryContent; ctx: RenderCtx }) {
  const cols = ctx.device === "desktop" ? content.cols : Math.min(content.cols, 2);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: "var(--space-3)",
      }}
    >
      {content.images.map((image, i) => (
        <figure key={i} style={{ margin: 0 }}>
          {image.src ? (
            // eslint-disable-next-line @next/next/no-img-element -- author media has unknown dimensions/hosts; next/image needs sizing + remotePatterns
            <img
              src={image.src}
              alt={image.alt}
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                objectFit: "cover",
                display: "block",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
              }}
            />
          ) : (
            <MediaPlaceholder label={String(i + 1).padStart(2, "0")} ratio="1 / 1" />
          )}
          {image.caption && (
            <figcaption
              style={{
                marginTop: "var(--space-1-5)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-2xs)",
                color: "var(--text-faint)",
              }}
            >
              {image.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

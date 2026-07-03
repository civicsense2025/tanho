import type { RenderCtx } from "../types";
import type { ImageContent } from "./fields";
import { CAPTION_STYLE, MediaPlaceholder } from "./Placeholder";

/** Figure with caption; empty src falls back to the striped placeholder. */
export function RenderImage({ content }: { content: ImageContent; ctx: RenderCtx }) {
  return (
    <figure style={{ margin: 0 }}>
      {content.src ? (
        // eslint-disable-next-line @next/next/no-img-element -- author media has unknown dimensions/hosts; next/image needs sizing + remotePatterns
        <img
          src={content.src}
          alt={content.alt}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
          }}
        />
      ) : (
        <MediaPlaceholder label={content.alt || content.caption || "Image · 16:9"} />
      )}
      {content.caption && <figcaption style={CAPTION_STYLE}>{content.caption}</figcaption>}
    </figure>
  );
}

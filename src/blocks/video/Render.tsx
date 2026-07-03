import type { RenderCtx } from "../types";
import { CAPTION_STYLE, MediaPlaceholder } from "../image/Placeholder";
import type { VideoContent } from "./fields";

/** Centered play chip shown over the empty-state placeholder. */
function PlayChip() {
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "var(--radius-pill)",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
          color: "var(--text)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
        }}
      >
        <span style={{ marginLeft: "3px" }}>▶</span>
      </span>
    </span>
  );
}

/** Native <video controls> when a source is set, else striped placeholder. */
export function RenderVideo({ content }: { content: VideoContent; ctx: RenderCtx }) {
  return (
    <figure style={{ margin: 0 }}>
      {content.src ? (
        <video
          controls
          src={content.src}
          poster={content.poster || undefined}
          style={{
            width: "100%",
            display: "block",
            aspectRatio: "16 / 9",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        />
      ) : (
        <MediaPlaceholder label="Video" overlay={<PlayChip />} />
      )}
      {content.caption && <figcaption style={CAPTION_STYLE}>{content.caption}</figcaption>}
    </figure>
  );
}

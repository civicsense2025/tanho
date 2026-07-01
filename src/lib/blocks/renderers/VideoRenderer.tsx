import type { VideoBlockContent } from "../types";

export function VideoRenderer({ content }: { content: VideoBlockContent }) {
  return (
    <figure style={{ margin: 0 }}>
      <video src={content.url} controls style={{ width: "100%", borderRadius: "var(--radius-sm)", background: "var(--surface)" }} poster={content.poster} />
      {content.caption && (
        <figcaption style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", marginTop: "var(--space-2)", textAlign: "center" }}>{content.caption}</figcaption>
      )}
    </figure>
  );
}

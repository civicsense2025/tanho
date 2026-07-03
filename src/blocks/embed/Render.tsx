import type { RenderCtx } from "../types";
import { MediaPlaceholder } from "../image/Placeholder";
import type { EmbedContent } from "./fields";

/**
 * Per-provider allowlist — an <iframe> renders ONLY when the URL parses,
 * is https, and its hostname + path match the provider's embed endpoint.
 * Everything else falls back to the inert striped placeholder.
 */
function resolveEmbedSrc(provider: EmbedContent["provider"], url: string): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;

  if (provider === "youtube") {
    if (
      (u.hostname === "www.youtube.com" || u.hostname === "youtube.com") &&
      u.pathname.startsWith("/embed/")
    ) {
      return u.href;
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1);
      if (/^[A-Za-z0-9_-]{5,20}$/.test(id)) return `https://www.youtube.com/embed/${id}`;
    }
    return null;
  }
  if (provider === "figma") {
    return u.hostname === "www.figma.com" && u.pathname.startsWith("/embed") ? u.href : null;
  }
  if (provider === "maps") {
    return u.hostname === "www.google.com" && u.pathname.startsWith("/maps/embed")
      ? u.href
      : null;
  }
  return null;
}

/** Sandboxed third-party embed; unknown URLs render a placeholder card. */
export function RenderEmbed({ content }: { content: EmbedContent; ctx: RenderCtx }) {
  const src = resolveEmbedSrc(content.provider, content.url);
  if (!src) {
    return <MediaPlaceholder label={`${content.provider} · embed`} ratio={content.ratio} />;
  }
  return (
    <iframe
      src={src}
      title={`${content.provider} embed`}
      sandbox="allow-scripts allow-same-origin allow-presentation"
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
      style={{
        display: "block",
        width: "100%",
        aspectRatio: content.ratio,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
      }}
    />
  );
}

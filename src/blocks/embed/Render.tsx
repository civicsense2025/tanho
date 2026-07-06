import Script from "next/script";
import type { RenderCtx } from "../types";
import { MediaPlaceholder } from "../image/Placeholder";
import type { EmbedContent } from "./fields";

/**
 * Per-provider allowlist for the iframe-based providers. `url` is expected
 * to ALREADY be the final, resolved embed URL (resolution happens once, at
 * write time — see modules/embeds/resolve.ts) — this function re-validates
 * that shape defensively at render time rather than trusting "it was
 * resolved once" as proof it's still safe to render blindly. Still accepts
 * a plain (unresolved) share-form URL for youtube/vimeo/spotify too, so a
 * hand-authored block content object continues to work even without going
 * through the resolver first. Everything else falls back to the inert
 * striped placeholder. "twitter" is handled separately — see RenderEmbed —
 * since it renders a <blockquote>+script, not an iframe.
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
  if (provider === "vimeo") {
    return u.hostname === "player.vimeo.com" && u.pathname.startsWith("/video/") ? u.href : null;
  }
  if (provider === "spotify") {
    return u.hostname === "open.spotify.com" && u.pathname.startsWith("/embed/") ? u.href : null;
  }
  if (provider === "soundcloud") {
    return u.hostname === "w.soundcloud.com" ? u.href : null;
  }
  if (provider === "custom") {
    // Donation / interactive-form embeds (ActBlue, Donorbox, …). Same discipline
    // as every other provider: an https url on a TRUSTED-HOST allowlist, never an
    // arbitrary iframe (which would be a clickjacking / malicious-content vector).
    // Add a host here to support another donation/form widget.
    const CUSTOM_HOSTS = new Set([
      "secure.actblue.com",
      "donorbox.org",
      "www.gofundme.com",
      "checkout.fundraiseup.com",
      "www.paypal.com",
      "commerce.coinbase.com",
      "app.givebutter.com",
      "buy.stripe.com",
    ]);
    return CUSTOM_HOSTS.has(u.hostname) ? u.href : null;
  }
  return null;
}

/** The tweet URL's shape, re-validated at render time (never trust "it was
 *  resolved once" as proof it's still a real twitter.com/x.com status link). */
function isValidTweetUrl(url: string): boolean {
  if (!url) return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const hosts = new Set(["twitter.com", "www.twitter.com", "x.com", "www.x.com"]);
  return hosts.has(u.hostname) && /^\/[A-Za-z0-9_]{1,15}\/status\/\d+/.test(u.pathname);
}

/** Sandboxed third-party embed; unknown URLs render a placeholder card. */
export function RenderEmbed({ content }: { content: EmbedContent; ctx: RenderCtx }) {
  if (content.provider === "twitter") {
    if (!isValidTweetUrl(content.url)) {
      return <MediaPlaceholder label="twitter · embed" ratio={content.ratio} />;
    }
    return (
      <>
        {/* X's documented oEmbed markup — widgets.js scans the page for this
         *  exact blockquote shape and replaces it with the rendered tweet. */}
        <blockquote className="twitter-tweet">
          <a href={content.url}>{content.url}</a>
        </blockquote>
        {/* strategy="lazyOnload" + a stable id: next/script's module-level
         *  load cache dedupes by id/src, so N tweet blocks on one page still
         *  only load this script once — no page-level coordination needed. */}
        <Script id="twitter-widgets" src="https://platform.twitter.com/widgets.js" strategy="lazyOnload" />
      </>
    );
  }

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

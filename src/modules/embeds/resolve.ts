/**
 * Shared embed-URL resolver — the single place that turns a share URL
 * (what a creator pastes, or what an importer extracts from a source
 * platform's export) into the safe, validated embed URL a specific
 * provider's iframe/widget actually needs. Resolution happens ONCE, at
 * write time (editor save, or import commit) — never live at render, so
 * the block's render path (blocks/embed/Render.tsx) stays a fast,
 * synchronous, no-I/O check that a stored url still matches its provider's
 * pattern. Two consumers: the embed block's editor field (blocks/embed's
 * paste-a-link UX) and the Ghost importer's embed-card mapping.
 */

export type EmbedProvider = "youtube" | "figma" | "maps" | "vimeo" | "spotify" | "soundcloud" | "twitter" | "custom";

/** Trusted donation / interactive-form iframe hosts for the "custom" provider —
 *  kept in lockstep with blocks/embed/Render.tsx's CUSTOM_HOSTS. Not arbitrary:
 *  an author embeds an ActBlue/Donorbox/etc. widget, never a raw iframe. */
const CUSTOM_EMBED_HOSTS = new Set([
  "secure.actblue.com",
  "donorbox.org",
  "www.gofundme.com",
  "checkout.fundraiseup.com",
  "www.paypal.com",
  "commerce.coinbase.com",
  "app.givebutter.com",
  "buy.stripe.com",
]);

export type ResolvedEmbed = { ok: true; provider: EmbedProvider; url: string };
export type ResolveEmbedResult = ResolvedEmbed | { ok: false; error: string };

const SOUNDCLOUD_OEMBED_TIMEOUT_MS = 8_000;

/**
 * youtube/figma/maps/vimeo/spotify: pure synchronous hostname/path rewrites,
 * identical in spirit to blocks/embed/Render.tsx's resolveEmbedSrc — no
 * network call, a share URL either matches the provider's known shape or it
 * doesn't. Kept in lockstep with that function's YouTube/Figma/Maps rules
 * (those three are unchanged) plus the three new providers.
 */
function resolveSyncProvider(url: URL): ResolvedEmbed | null {
  if (url.protocol !== "https:") return null;

  if (url.hostname === "www.youtube.com" || url.hostname === "youtube.com") {
    if (url.pathname.startsWith("/embed/")) return { ok: true, provider: "youtube", url: url.href };
    // youtube.com/watch?v=ID -> youtube.com/embed/ID
    const id = url.searchParams.get("v");
    if (id && /^[A-Za-z0-9_-]{5,20}$/.test(id)) {
      return { ok: true, provider: "youtube", url: `https://www.youtube.com/embed/${id}` };
    }
    return null;
  }
  if (url.hostname === "youtu.be") {
    const id = url.pathname.slice(1);
    if (/^[A-Za-z0-9_-]{5,20}$/.test(id)) {
      return { ok: true, provider: "youtube", url: `https://www.youtube.com/embed/${id}` };
    }
    return null;
  }

  if (url.hostname === "www.figma.com") {
    if (url.pathname.startsWith("/embed")) return { ok: true, provider: "figma", url: url.href };
    return null;
  }

  if (url.hostname === "www.google.com" && url.pathname.startsWith("/maps/embed")) {
    return { ok: true, provider: "maps", url: url.href };
  }

  if (url.hostname === "vimeo.com" || url.hostname === "www.vimeo.com" || url.hostname === "player.vimeo.com") {
    if (url.hostname === "player.vimeo.com" && url.pathname.startsWith("/video/")) {
      return { ok: true, provider: "vimeo", url: url.href };
    }
    // vimeo.com/ID (optionally /ID/HASH for unlisted videos) -> player.vimeo.com/video/ID[?h=HASH]
    const segments = url.pathname.split("/").filter(Boolean);
    const id = segments[0];
    if (id && /^\d+$/.test(id)) {
      const hash = segments[1];
      const embedUrl = hash ? `https://player.vimeo.com/video/${id}?h=${encodeURIComponent(hash)}` : `https://player.vimeo.com/video/${id}`;
      return { ok: true, provider: "vimeo", url: embedUrl };
    }
    return null;
  }

  if (url.hostname === "open.spotify.com") {
    if (url.pathname.startsWith("/embed/")) return { ok: true, provider: "spotify", url: url.href };
    // open.spotify.com/track/ID -> open.spotify.com/embed/track/ID (also episode/album/playlist/show)
    const match = url.pathname.match(/^\/(track|episode|album|playlist|show)\/([A-Za-z0-9]+)/);
    if (match) {
      return { ok: true, provider: "spotify", url: `https://open.spotify.com/embed/${match[1]}/${match[2]}` };
    }
    return null;
  }

  if (CUSTOM_EMBED_HOSTS.has(url.hostname)) {
    return { ok: true, provider: "custom", url: url.href };
  }

  return null;
}

/**
 * twitter/x.com: no iframe — the render path (blocks/embed/Render.tsx) uses
 * a documented <blockquote class="twitter-tweet"> + widgets.js script, not
 * an iframe src. This just validates the tweet URL's shape and returns it
 * as-is; the block stores this URL and renders the blockquote from it.
 */
function resolveTwitter(url: URL): ResolvedEmbed | null {
  if (url.protocol !== "https:") return null;
  if (url.hostname !== "twitter.com" && url.hostname !== "x.com" && url.hostname !== "www.twitter.com" && url.hostname !== "www.x.com") {
    return null;
  }
  // /<user>/status/<id>
  if (/^\/[A-Za-z0-9_]{1,15}\/status\/\d+/.test(url.pathname)) {
    return { ok: true, provider: "twitter", url: url.href };
  }
  return null;
}

/**
 * soundcloud.com: the one provider that genuinely needs external resolution
 * — SoundCloud's player iframe requires an api.soundcloud.com/tracks/{id}
 * URL that isn't derivable from a plain share URL by pattern-matching alone
 * (verified directly against SoundCloud's live oEmbed endpoint). Calls
 * SoundCloud's public, unauthenticated oEmbed API and extracts the resolved
 * iframe src from its response — never throws, never blocks on a hung
 * request past the timeout.
 */
async function resolveSoundcloud(url: URL): Promise<ResolveEmbedResult> {
  if (url.protocol !== "https:") return { ok: false, error: "SoundCloud links must be https" };
  if (url.hostname !== "soundcloud.com" && url.hostname !== "www.soundcloud.com" && url.hostname !== "m.soundcloud.com") {
    return { ok: false, error: "Not a soundcloud.com URL" };
  }

  const oembedUrl = `https://soundcloud.com/oembed?url=${encodeURIComponent(url.href)}&format=json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOUNDCLOUD_OEMBED_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(oembedUrl, {
      signal: controller.signal,
      headers: { accept: "application/json" },
      redirect: "error",
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "SoundCloud oEmbed request failed" };
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) return { ok: false, error: `SoundCloud oEmbed returned ${res.status}` };

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, error: "SoundCloud oEmbed returned malformed JSON" };
  }
  const html = typeof body === "object" && body !== null && "html" in body ? (body as { html: unknown }).html : null;
  if (typeof html !== "string") return { ok: false, error: "SoundCloud oEmbed response had no html field" };

  // Extract src="..." from the returned <iframe> without treating the rest
  // of the html as trusted markup — we only ever read one attribute value
  // out of it, we never render or store the html itself.
  const srcMatch = html.match(/\bsrc="([^"]+)"/);
  if (!srcMatch) return { ok: false, error: "Could not find an iframe src in the SoundCloud oEmbed response" };

  let iframeSrc: URL;
  try {
    iframeSrc = new URL(srcMatch[1]!.replace(/&amp;/g, "&"));
  } catch {
    return { ok: false, error: "SoundCloud oEmbed returned an unparseable iframe src" };
  }
  if (iframeSrc.protocol !== "https:" || iframeSrc.hostname !== "w.soundcloud.com") {
    return { ok: false, error: "SoundCloud oEmbed returned an unexpected iframe host" };
  }

  return { ok: true, provider: "soundcloud", url: iframeSrc.href };
}

/**
 * Resolve any supported share URL into a safe, provider-specific embed URL.
 * Never throws — every failure path (bad input, unknown provider, network
 * error, malformed third-party response) returns {ok:false, error}.
 */
export async function resolveEmbedUrl(shareUrl: string): Promise<ResolveEmbedResult> {
  let url: URL;
  try {
    url = new URL(shareUrl);
  } catch {
    return { ok: false, error: "Not a valid URL" };
  }

  const sync = resolveSyncProvider(url) ?? resolveTwitter(url);
  if (sync) return sync;

  if (url.hostname === "soundcloud.com" || url.hostname === "www.soundcloud.com" || url.hostname === "m.soundcloud.com") {
    return resolveSoundcloud(url);
  }

  return { ok: false, error: "URL did not match any supported embed provider" };
}

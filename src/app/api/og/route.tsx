import { ImageResponse } from "next/og";
import { getGeneralSettings } from "@/modules/settings/queries";
import { getTheme } from "@/modules/theme/queries";
import { OG_DIMENSIONS } from "@/modules/seo";
import { allowEvent } from "@/modules/analytics/rate-limit";

/** Best-effort client key for rate-limiting a cookieless GET. */
function clientKey(request: Request): string {
  const h = request.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "anon"
  );
}

/**
 * GET /api/og?title=…&tag=… — the generated branded share card, used as the
 * Open Graph / Twitter image fallback whenever a page has no uploaded image
 * (see resolveOgImage). Renders the page title + site name over the site's
 * brand colours via next/og's ImageResponse.
 *
 * Inputs are clamped and rendered as plain text nodes (never as HTML), so a
 * hostile ?title= can't inject markup. The image is deterministic for a given
 * (title, tag, theme) and cached hard at the edge via the cache header — but the
 * query string is part of the cache key, so a flood of unique ?title= values
 * would miss cache and force fresh (CPU-heavy) satori renders. Rate-limited per
 * client IP to cap that amplification; well-behaved crawlers hit the CDN cache
 * and never reach the limiter.
 */
export async function GET(request: Request): Promise<Response> {
  if (!allowEvent(`og:${clientKey(request)}`)) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const [general, theme] = await Promise.all([getGeneralSettings(), getTheme()]);

  const title = (searchParams.get("title") || general.name).slice(0, 120);
  const tag = (searchParams.get("tag") || "").slice(0, 40);
  const siteName = general.name.slice(0, 60);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: theme.paper,
          color: theme.ink,
          fontFamily: "sans-serif",
        }}
      >
        {/* Accent rule at the top */}
        <div style={{ display: "flex", height: 12, width: 160, background: theme.accent, borderRadius: 6 }} />

        {/* Title block */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {tag ? (
            <div
              style={{
                display: "flex",
                fontSize: 30,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: theme.accent2,
                fontWeight: 600,
              }}
            >
              {tag}
            </div>
          ) : null}
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.1 }}>
            {title}
          </div>
        </div>

        {/* Site name footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", width: 40, height: 40, borderRadius: 8, background: theme.accent }} />
          <div style={{ display: "flex", fontSize: 34, fontWeight: 600, color: theme.accent }}>{siteName}</div>
        </div>
      </div>
    ),
    {
      ...OG_DIMENSIONS,
      headers: {
        // Deterministic per (title, tag, theme); safe to cache hard at the edge.
        "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}

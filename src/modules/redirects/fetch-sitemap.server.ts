import "server-only";
import { hostnameResolvesToBlockedIp, isLoopbackOrLinkLocalIp, isPrivateRangeIp } from "@/lib/ssrf-guard";

/**
 * SERVER-ONLY. Fetch a user-supplied sitemap URL with full SSRF hardening,
 * mirroring the feed importer (src/modules/importers/rss/fetch-feed.server.ts):
 * https-only, every resolved IP checked against BOTH the loopback/link-local
 * (incl. 169.254.169.254 cloud-metadata) and RFC1918 private-range blocklists,
 * manual redirects re-validated for one hop, a 10s timeout, and a size cap. A
 * sitemap has no LAN use case, so nothing private is ever a valid host.
 *
 * Lives in a `.server.ts` file because ssrf-guard.ts imports
 * `node:dns/promises` (no browser shim). Never throws — every failure path
 * returns `{ ok:false, error }`.
 */

const SITEMAP_FETCH_TIMEOUT_MS = 10_000;
const MAX_SITEMAP_BYTES = 10_000_000; // 10MB — a sitemap is XML text.
const USER_AGENT = "OwnYourSite-Migration/1.0 (+https://ownyoursite.app)";

type FetchResult = { ok: true; xml: string } | { ok: false; error: string };

async function isSafeSitemapUrl(url: URL): Promise<{ ok: true } | { ok: false; error: string }> {
  if (url.protocol !== "https:") {
    return { ok: false, error: "Only https:// sitemap URLs are allowed" };
  }
  const blocked = await hostnameResolvesToBlockedIp(
    url.hostname,
    (ip) => isLoopbackOrLinkLocalIp(ip) || isPrivateRangeIp(ip),
  );
  if (blocked) return { ok: false, error: "That host is not allowed" };
  return { ok: true };
}

function rawFetch(target: URL): Promise<Response> {
  return fetch(target.href, {
    redirect: "manual", // a 3xx could point at the metadata endpoint — never auto-follow.
    signal: AbortSignal.timeout(SITEMAP_FETCH_TIMEOUT_MS),
    headers: { "user-agent": USER_AGENT, accept: "application/xml, text/xml, */*" },
  });
}

async function readCapped(res: Response): Promise<{ ok: true; xml: string } | { ok: false; error: string }> {
  const text = await res.text();
  if (text.length > MAX_SITEMAP_BYTES) return { ok: false, error: "Sitemap is too large" };
  return { ok: true, xml: text };
}

/**
 * Fetch a sitemap URL's XML text with SSRF hardening. Allows at most ONE
 * redirect hop, re-validating the redirect target through the same https +
 * SSRF checks before following it.
 */
export async function fetchSitemap(rawUrl: string): Promise<FetchResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, error: "Invalid URL" };
  }

  const firstCheck = await isSafeSitemapUrl(url);
  if (!firstCheck.ok) return { ok: false, error: firstCheck.error };

  try {
    let res = await rawFetch(url);

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return { ok: false, error: "Could not fetch the sitemap" };
      let next: URL;
      try {
        next = new URL(location, url);
      } catch {
        return { ok: false, error: "That host is not allowed" };
      }
      const secondCheck = await isSafeSitemapUrl(next);
      if (!secondCheck.ok) return { ok: false, error: secondCheck.error };

      res = await rawFetch(next);
      if (res.status >= 300 && res.status < 400) {
        return { ok: false, error: "Sitemap redirected too many times" };
      }
    }

    if (res.status < 200 || res.status >= 300) {
      return { ok: false, error: `Sitemap returned ${res.status}` };
    }

    const body = await readCapped(res);
    if (!body.ok) return { ok: false, error: body.error };
    return { ok: true, xml: body.xml };
  } catch {
    return { ok: false, error: "Could not fetch the sitemap" };
  }
}

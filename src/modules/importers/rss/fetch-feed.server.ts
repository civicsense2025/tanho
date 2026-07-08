import "server-only";
import { hostnameResolvesToBlockedIp, isLoopbackOrLinkLocalIp, isPrivateRangeIp } from "@/lib/ssrf-guard";
import type { Result } from "../shared/types";

/**
 * SERVER-ONLY. Fetches a user-supplied feed URL with full SSRF hardening. This
 * is the one importer path that makes an outbound request to an arbitrary,
 * attacker-controlled host, so every layer of the request is locked down:
 *
 *  - https ONLY (an http:// URL, or a redirect to one, is rejected). A plain
 *    http request could be silently downgraded/MITM'd and http has no
 *    legitimate use for a public feed.
 *  - The hostname is resolved and EVERY resolved IP is checked against BOTH
 *    the loopback/link-local blocklist (127.*, 169.254.* incl. the
 *    169.254.169.254 cloud-metadata endpoint, ::1, fe80:) AND the RFC1918
 *    private-range blocklist (10.*, 192.168.*, 172.16–31.*, fc00::/7). Unlike
 *    the data-sources feature, a feed has NO LAN use case, so both predicates
 *    are combined — nothing private is ever a valid feed host.
 *  - Redirects are NOT auto-followed (`redirect: "manual"`): a 302 could point
 *    at the metadata endpoint. A single redirect hop is allowed, but only
 *    after re-running the SAME https + SSRF checks on the Location URL.
 *  - A 10s AbortSignal timeout bounds a hung/slowloris host.
 *  - The response body is size-capped at 10MB (a feed is text; anything larger
 *    is either an attack or not a feed).
 *
 * Never throws — every failure path returns `{ok:false, error}`.
 *
 * Lives in a `.server.ts` file because ssrf-guard.ts imports
 * `node:dns/promises` (a Node built-in with no browser shim); importing this
 * from a client chunk would 500 the bundle. See data-sources/validation.server.ts.
 */

const FEED_FETCH_TIMEOUT_MS = 10_000;
const MAX_FEED_BYTES = 10_000_000; // 10MB — a feed is text; larger is an attack or not a feed.
const USER_AGENT = "OwnYourSite-FeedImporter/1.0 (+https://ownyoursite.app)";

/** True when the URL is https AND its host resolves to no blocked (loopback,
 *  link-local, OR private-range) IP. Combines BOTH ssrf-guard predicates — a
 *  feed has no reason to live on a private/loopback address. */
async function isSafeFeedUrl(url: URL): Promise<{ ok: true } | { ok: false; error: string }> {
  if (url.protocol !== "https:") {
    return { ok: false, error: "Only https:// feed URLs are allowed" };
  }
  const blocked = await hostnameResolvesToBlockedIp(
    url.hostname,
    (ip) => isLoopbackOrLinkLocalIp(ip) || isPrivateRangeIp(ip),
  );
  if (blocked) return { ok: false, error: "That host is not allowed" };
  return { ok: true };
}

/** One raw fetch with the shared hardening (manual redirects, timeout, UA).
 *  Returns the Response; callers own status/redirect interpretation. */
function rawFetch(target: URL): Promise<Response> {
  return fetch(target.href, {
    redirect: "manual", // a 3xx could point at the metadata endpoint — never auto-follow.
    signal: AbortSignal.timeout(FEED_FETCH_TIMEOUT_MS),
    headers: { "user-agent": USER_AGENT, accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
  });
}

/** Read a Response body as text with a hard size cap. The body is streamed
 *  chunk-by-chunk and the reader is cancelled the moment the accumulated byte
 *  count crosses the cap, so a hostile host streaming GBs is aborted before it
 *  can exhaust memory — `res.text()` would buffer the whole body first. A
 *  `Content-Length` header over the cap is rejected upfront with no body read.
 *  When `res.body` is null (some runtimes), falls back to `res.text()` with a
 *  post-check — the original behavior, as a safe default. */
export async function readCapped(res: Response): Promise<{ ok: true; data: string } | { ok: false; error: string }> {
  const contentLength = res.headers.get("content-length");
  if (contentLength) {
    const len = Number(contentLength);
    if (Number.isFinite(len) && len > MAX_FEED_BYTES) {
      return { ok: false, error: "Feed is too large" };
    }
  }

  // Some runtimes (and our test mocks) expose no streaming body — fall back to
  // the buffer-then-check path. Safe because those bodies are already in memory.
  if (!res.body) {
    const text = await res.text();
    if (text.length > MAX_FEED_BYTES) return { ok: false, error: "Feed is too large" };
    return { ok: true, data: text };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (; ;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_FEED_BYTES) {
        // Cancel the underlying stream so the host stops sending, then bail
        // before buffering any more of the oversized body.
        await reader.cancel();
        return { ok: false, error: "Feed is too large" };
      }
      chunks.push(value);
    }
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { ok: true, data: decoder.decode(merged) };
  } finally {
    reader.releaseLock();
  }
}

/**
 * Fetch a feed URL's XML text with SSRF hardening. Allows at most ONE redirect
 * hop, re-validating the redirect target through the same https + SSRF checks.
 */
export async function fetchFeed(rawUrl: string): Promise<Result<string>> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, error: "Invalid URL" };
  }

  const firstCheck = await isSafeFeedUrl(url);
  if (!firstCheck.ok) return { ok: false, error: firstCheck.error };

  try {
    let res = await rawFetch(url);

    // One redirect hop, re-checked. A 3xx Location is re-validated (https +
    // SSRF) BEFORE the second fetch, so a redirect to the metadata endpoint or
    // a private host is rejected, not followed.
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return { ok: false, error: "Could not fetch the feed" };
      let next: URL;
      try {
        // Resolve relative Location against the original URL, then re-validate.
        next = new URL(location, url);
      } catch {
        return { ok: false, error: "That host is not allowed" };
      }
      const secondCheck = await isSafeFeedUrl(next);
      if (!secondCheck.ok) return { ok: false, error: secondCheck.error };

      res = await rawFetch(next);
      // A second redirect is not followed — one hop max.
      if (res.status >= 300 && res.status < 400) {
        return { ok: false, error: "Feed redirected too many times" };
      }
    }

    if (res.status < 200 || res.status >= 300) {
      return { ok: false, error: `Feed returned ${res.status}` };
    }

    const body = await readCapped(res);
    if (!body.ok) return { ok: false, error: body.error };
    return { ok: true, data: body.data };
  } catch {
    // Network error, timeout/abort, or any unexpected throw — one generic error.
    return { ok: false, error: "Could not fetch the feed" };
  }
}

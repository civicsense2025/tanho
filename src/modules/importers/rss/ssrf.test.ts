import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SECURITY GATE. fetchFeed is the one importer path that reaches an arbitrary,
 * attacker-controlled host. These tests assert the SSRF defenses hold:
 *  - http:// is rejected (https-only).
 *  - a literal loopback IP (127.0.0.1) is rejected.
 *  - the cloud-metadata endpoint (169.254.169.254) is rejected.
 *  - a hostname that RESOLVES to a private IP (10.0.0.5) is rejected — the DNS
 *    lookup is mocked so no real network/DNS is touched.
 *  - a redirect to the metadata endpoint is NOT followed (the Location is
 *    re-validated and rejected).
 *  - a normal public https feed (dns → public IP, fetch → 200) succeeds.
 *
 * `node:dns/promises` (used transitively by ssrf-guard) and `global.fetch` are
 * both mocked, so nothing here makes a real request.
 */

// A controllable dns lookup — each test sets what the next resolution returns.
const lookupMock = vi.fn<(hostname: string, opts?: unknown) => Promise<{ address: string }[]>>();
vi.mock("node:dns/promises", () => ({ lookup: (hostname: string, opts?: unknown) => lookupMock(hostname, opts) }));

// Import AFTER the mock is registered so ssrf-guard binds the mocked lookup.
const { fetchFeed } = await import("./fetch-feed.server");

const RSS_BODY = `<?xml version="1.0"?><rss version="2.0"><channel>
  <item><title>Post</title><link>https://public.example.com/post/</link><description>body</description></item>
</channel></rss>`;

/** Minimal Response stand-in for the fetch mock. */
function makeResponse(opts: { status: number; location?: string; body?: string }): Response {
  const headers = new Headers();
  if (opts.location) headers.set("location", opts.location);
  return {
    status: opts.status,
    headers,
    text: async () => opts.body ?? "",
  } as unknown as Response;
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  lookupMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchFeed — SSRF hardening", () => {
  it("rejects an http:// URL (https only)", async () => {
    const res = await fetchFeed("http://example.com/feed.xml");
    expect(res.ok).toBe(false);
    // Never even attempted a fetch.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a literal loopback IP (127.0.0.1)", async () => {
    const res = await fetchFeed("https://127.0.0.1/feed");
    expect(res.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects the cloud-metadata endpoint (169.254.169.254)", async () => {
    const res = await fetchFeed("https://169.254.169.254/latest/meta-data");
    expect(res.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a hostname that resolves to a private IP (10.0.0.5)", async () => {
    lookupMock.mockResolvedValue([{ address: "10.0.0.5" }]);
    const res = await fetchFeed("https://internal.example.com/feed.xml");
    expect(res.ok).toBe(false);
    expect(lookupMock).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does NOT follow a redirect to the metadata endpoint", async () => {
    // Host resolves public, so the first fetch runs; it returns a 302 whose
    // Location points at the metadata endpoint (http + link-local). The
    // Location must be re-validated and rejected, never fetched.
    lookupMock.mockResolvedValue([{ address: "93.184.216.34" }]); // public
    fetchMock.mockResolvedValueOnce(makeResponse({ status: 302, location: "http://169.254.169.254/latest/meta-data" }));
    const res = await fetchFeed("https://public.example.com/feed.xml");
    expect(res.ok).toBe(false);
    // Only the first hop was fetched; the redirect target was never requested.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("allows a normal public https feed (dns → public IP, fetch → 200)", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34" }]); // public
    fetchMock.mockResolvedValueOnce(makeResponse({ status: 200, body: RSS_BODY }));
    const res = await fetchFeed("https://public.example.com/feed.xml");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toContain("<rss");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an unparseable URL", async () => {
    const res = await fetchFeed("not a url");
    expect(res.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a non-2xx status from a public host", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34" }]);
    fetchMock.mockResolvedValueOnce(makeResponse({ status: 404 }));
    const res = await fetchFeed("https://public.example.com/missing.xml");
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toContain("404");
  });

  it("rejects a feed body over the size cap", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34" }]);
    const huge = "x".repeat(10_000_001);
    fetchMock.mockResolvedValueOnce(makeResponse({ status: 200, body: huge }));
    const res = await fetchFeed("https://public.example.com/huge.xml");
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toContain("too large");
  });
});

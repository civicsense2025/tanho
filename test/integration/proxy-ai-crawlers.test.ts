import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Sibling to proxy-allowlist.test.ts, kept separate because this file needs siteConfig mocked
// (to flip features.blockAiCrawlers per test) while proxy-allowlist.test.ts asserts against the
// real, unmocked config.matcher/PROTECTED_API_PREFIXES_FOR_TEST -- mixing the two would risk the
// mock leaking into the drift-guard assertions there.
//
// Confirms the AI-crawler short-circuit in proxy() actually 403s a blocked bot UA on a public
// (non-admin, non-API) route when the flag is on, and passes through unaffected when it's off --
// the exact wiring gap the plan calls out for features.guides never getting this coverage.

const mockSiteConfig = { features: { blockAiCrawlers: false } };

vi.mock("@/config/site.config", () => ({ siteConfig: mockSiteConfig }));

const { proxy } = await import("@/proxy");

beforeEach(() => {
  mockSiteConfig.features.blockAiCrawlers = false;
});

function reqWithUserAgent(userAgent: string, pathname = "/posts/some-slug") {
  return new NextRequest(new Request(`http://localhost${pathname}`, { headers: { "user-agent": userAgent } }));
}

describe("proxy() AI-crawler short-circuit", () => {
  it("403s a blocked bot UA on a public content route when the flag is on", async () => {
    mockSiteConfig.features.blockAiCrawlers = true;
    const res = await proxy(reqWithUserAgent("GPTBot/1.0"));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("passes a blocked bot UA through (no 403) when the flag is off", async () => {
    mockSiteConfig.features.blockAiCrawlers = false;
    const res = await proxy(reqWithUserAgent("GPTBot/1.0"));
    expect(res.status).not.toBe(403);
  });

  it("passes a normal browser UA through even when the flag is on", async () => {
    mockSiteConfig.features.blockAiCrawlers = true;
    const res = await proxy(
      reqWithUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
      )
    );
    expect(res.status).not.toBe(403);
  });

  it("does not alter existing admin-redirect behavior when the flag is off and UA doesn't match", async () => {
    mockSiteConfig.features.blockAiCrawlers = false;
    const res = await proxy(reqWithUserAgent("Mozilla/5.0 Chrome/120.0", "/admin/dashboard"));
    // No admin_token cookie on this request -> existing logic redirects to /admin/login.
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/admin/login");
  });
});

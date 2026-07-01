import { describe, it, expect, vi, beforeEach } from "vitest";
import { AI_CROWLER_USER_AGENTS } from "@/lib/ai-crawlers";

// robots.ts must emit rules that change with siteConfig.features.blockAiCrawlers -- this is the
// "declared but not enforced" gap the plan calls out for features.guides; a brand-new flag
// shouldn't repeat it. siteConfig is mocked as a mutable object so each test can flip the flag
// and re-invoke robots() directly, mirroring how robots.ts reads it live (not destructured at
// module scope).

const mockSiteConfig = { features: { blockAiCrawlers: false } };

vi.mock("@/config/site.config", () => ({ siteConfig: mockSiteConfig }));

const { default: robots } = await import("@/app/robots");

beforeEach(() => {
  mockSiteConfig.features.blockAiCrawlers = false;
});

function ruleList(rules: ReturnType<typeof robots>["rules"]) {
  return Array.isArray(rules) ? rules : [rules];
}

describe("robots() AI-crawler rules", () => {
  it("emits only the single '*' rule when the flag is off (default)", () => {
    const rules = ruleList(robots().rules);
    expect(rules).toHaveLength(1);
    expect(rules[0]).toEqual({ userAgent: "*", allow: "/", disallow: ["/admin", "/api"] });
  });

  it("adds one disallow rule per named AI crawler when the flag is on", () => {
    mockSiteConfig.features.blockAiCrawlers = true;
    const rules = ruleList(robots().rules);
    expect(rules).toHaveLength(1 + AI_CROWLER_USER_AGENTS.length);
    // The original "*" rule must stay untouched.
    expect(rules[0]).toEqual({ userAgent: "*", allow: "/", disallow: ["/admin", "/api"] });
    for (const userAgent of AI_CROWLER_USER_AGENTS) {
      expect(rules).toContainEqual({ userAgent, disallow: "/" });
    }
  });

  it("still points at the sitemap regardless of the flag", () => {
    expect(robots().sitemap).toMatch(/\/sitemap\.xml$/);
    mockSiteConfig.features.blockAiCrawlers = true;
    expect(robots().sitemap).toMatch(/\/sitemap\.xml$/);
  });
});

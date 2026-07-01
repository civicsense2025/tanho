import { describe, it, expect } from "vitest";
import { isBlockedAiCrawler, AI_CROWLER_USER_AGENTS } from "@/lib/ai-crawlers";

// isBlockedAiCrawler is the single source of truth consumed by both robots.ts and proxy.ts --
// a regression here would either silently stop blocking AI-training bots, or worse, start
// blocking legitimate search-engine crawlers a site owner never asked to exclude.
describe("isBlockedAiCrawler", () => {
  it("matches real AI-crawler user-agent strings", () => {
    expect(isBlockedAiCrawler("Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)")).toBe(true);
    expect(isBlockedAiCrawler("Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)")).toBe(true);
    expect(isBlockedAiCrawler("CCBot/2.0 (https://commoncrawl.org/faq/)")).toBe(true);
    expect(isBlockedAiCrawler("Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(isBlockedAiCrawler("gptbot/1.0")).toBe(true);
    expect(isBlockedAiCrawler("GPTBOT/1.0")).toBe(true);
  });

  it("does not block normal browser user agents", () => {
    expect(
      isBlockedAiCrawler(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
      )
    ).toBe(false);
    expect(
      isBlockedAiCrawler(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      )
    ).toBe(false);
  });

  it("does not block search-engine crawlers -- the point is blocking AI training/scraping, not search", () => {
    expect(isBlockedAiCrawler("Googlebot/2.1 (+http://www.google.com/bot.html)")).toBe(false);
    expect(isBlockedAiCrawler("Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)")).toBe(false);
  });

  it("handles an empty/missing user agent without throwing", () => {
    expect(isBlockedAiCrawler("")).toBe(false);
  });

  it("the exported allowlist is non-empty", () => {
    expect(AI_CROWLER_USER_AGENTS.length).toBeGreaterThan(0);
  });
});

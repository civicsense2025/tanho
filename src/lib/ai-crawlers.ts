/**
 * Single source of truth for named AI-crawler user agents, consumed by both
 * `src/app/robots.ts` (declares them disallowed in robots.txt) and `src/proxy.ts`
 * (actively 403s matching requests). Keeping one array/function here is what guarantees
 * those two enforcement points can never drift apart.
 *
 * This targets AI-training/scraping bots specifically -- NOT search-engine crawlers
 * (Googlebot, Bingbot, etc.), which must keep indexing the site normally.
 *
 * This list needs periodic upkeep as bots are renamed or added. The community-maintained
 * https://github.com/ai-robots-txt/ai.robots.txt is a good source to periodically diff
 * against for new/renamed bots -- since this ships as template source, a `git pull` from
 * upstream (or a manual re-check) is the actual distribution mechanism for keeping it
 * current, not a runtime fetch.
 */
export const AI_CROWLER_USER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "CCBot",
  "Google-Extended",
  "GoogleOther",
  "Bytespider",
  "PerplexityBot",
  "Perplexity-User",
  "Amazonbot",
  "Applebot-Extended",
  "FacebookBot",
  "meta-externalagent",
  "Diffbot",
  "cohere-ai",
  "cohere-training-data-crawler",
  "Timpibot",
  "Omgilibot",
  "Omgili",
  "YouBot",
  "ImagesiftBot",
  "Meltwater",
  "Bravebot",
  "Ai2Bot",
  "DuckAssistBot",
];

/** Case-insensitive substring match against `AI_CROWLER_USER_AGENTS`. Returns false for an
 * empty/missing user-agent string rather than throwing, so callers can pass a possibly-absent
 * header value directly. */
export function isBlockedAiCrawler(userAgent: string): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return AI_CROWLER_USER_AGENTS.some((name) => ua.includes(name.toLowerCase()));
}

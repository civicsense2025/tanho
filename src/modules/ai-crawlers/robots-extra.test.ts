import { describe, expect, it } from "vitest";
import { buildCrawlerRules, buildRslLine } from "./robots-extra";
import { aiCrawlersSettingsSchema } from "./validation";

const settings = (over: Record<string, unknown> = {}) =>
  aiCrawlersSettingsSchema.parse(over);

/** Find the rule object for a given bot user-agent. */
const ruleFor = (rules: ReturnType<typeof buildCrawlerRules>, bot: string) => {
  const arr = Array.isArray(rules) ? rules : [rules];
  return arr.find((r) => r && (r as { userAgent?: string }).userAgent === bot);
};

describe("buildCrawlerRules", () => {
  it("blocks a training bot with Disallow: / by default", () => {
    const rules = buildCrawlerRules(settings());
    const rule = ruleFor(rules, "GPTBot");
    expect(rule).toBeTruthy();
    expect(rule?.disallow).toBe("/");
    expect(rule?.allow).toBeUndefined();
  });

  it("allows a citation bot with Allow: / by default", () => {
    const rules = buildCrawlerRules(settings());
    const rule = ruleFor(rules, "OAI-SearchBot");
    expect(rule?.allow).toBe("/");
    expect(rule?.disallow).toBeUndefined();
  });

  it("blocks a citation bot when its per-bot toggle is off", () => {
    const rules = buildCrawlerRules(
      settings({ citationBots: { "PerplexityBot": false } }),
    );
    expect(ruleFor(rules, "PerplexityBot")?.disallow).toBe("/");
  });

  it("allows a training bot when both group and per-bot toggles are on", () => {
    const rules = buildCrawlerRules(
      settings({ allowTrainingBots: true, trainingBots: { ClaudeBot: true } }),
    );
    expect(ruleFor(rules, "ClaudeBot")?.allow).toBe("/");
  });

  it("blocks every bot when the master AI switch is off", () => {
    const rules = buildCrawlerRules(settings({ aiEnabled: false }));
    expect(ruleFor(rules, "OAI-SearchBot")?.disallow).toBe("/");
    expect(ruleFor(rules, "GPTBot")?.disallow).toBe("/");
  });
});

describe("buildRslLine", () => {
  it("returns null when RSL is disabled", () => {
    expect(buildRslLine(settings())).toBeNull();
  });

  it("returns a sanitised price line when enabled", () => {
    const line = buildRslLine(
      settings({ rsl: { enabled: true, priceUsd: "$1.2abc5", unit: "crawl" } }),
    );
    expect(line).toContain("$1.25");
    expect(line).toContain("per crawl");
    expect(line).not.toContain("abc");
  });
});

import type { AiCrawlersSettings } from "./validation";
import { CITATION_BOTS, TRAINING_BOTS } from "./validation";

/** One robots.txt user-agent block (subset of Next's Robots rule shape). */
export type CrawlerRule = { userAgent: string; allow?: string; disallow?: string };

/**
 * Per-bot robots.txt rules derived from the AI & crawlers settings. Each bot is
 * a discrete `User-agent` group; blocked bots get `Disallow: /`, allowed bots
 * get `Allow: /`. Next serialises these into the robots.txt after the site-wide
 * `*` rule.
 *
 * A bot is BLOCKED when: the master AI switch is off, OR its group toggle is off,
 * OR its individual toggle is off. Bot names come from a fixed allowlist (the
 * two BOTS constants) so nothing user-controlled reaches the output verbatim.
 */
export function buildCrawlerRules(settings: AiCrawlersSettings): CrawlerRule[] {
  const rules: CrawlerRule[] = [];

  const emit = (
    bots: readonly string[],
    groupAllowed: boolean,
    perBot: Record<string, boolean>,
  ) => {
    for (const bot of bots) {
      const allowed =
        settings.aiEnabled && groupAllowed && perBot[bot] !== false;
      rules.push(
        allowed
          ? { userAgent: bot, allow: "/" }
          : { userAgent: bot, disallow: "/" },
      );
    }
  };

  emit(CITATION_BOTS, settings.allowCitationBots, settings.citationBots);
  emit(TRAINING_BOTS, settings.allowTrainingBots, settings.trainingBots);

  return rules;
}

/**
 * The RSL (pay-per-crawl) advisory line, or null when disabled. Returned
 * separately because Next's `MetadataRoute.Robots` has no comment slot — the
 * caller appends this to `robots.txt` via the `host`/text tail. Price is
 * numeric-sanitised so nothing arbitrary lands in the file.
 */
export function buildRslLine(settings: AiCrawlersSettings): string | null {
  if (!settings.aiEnabled || !settings.rsl.enabled) return null;
  const price = sanitizePrice(settings.rsl.priceUsd);
  return `# RSL: content licensed at $${price} USD per ${settings.rsl.unit}`;
}

/** Keep only digits and a single decimal point — defends the robots.txt output. */
function sanitizePrice(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const [whole = "0", frac] = cleaned.split(".");
  return frac != null ? `${whole || "0"}.${frac.slice(0, 2)}` : whole || "0";
}

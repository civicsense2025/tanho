import type { AiCrawlersSettings } from "./validation";

/**
 * Build the llms.txt body (the emerging convention for pointing LLMs at a
 * site's canonical, machine-readable entry points). Plain text only; the site
 * name is stripped of control/markup characters so nothing arbitrary is echoed
 * into the served file.
 */
export function buildLlmsTxt(
  settings: AiCrawlersSettings,
  siteName: string,
  baseUrl: string,
): string {
  const name = plain(siteName) || "This site";
  const base = baseUrl.replace(/\/+$/, "");
  const lines = [
    `# ${name}`,
    "",
    `> Canonical entry points for AI assistants and language models.`,
    "",
    "## Site",
    `- [Sitemap](${base}/sitemap.xml)`,
    `- [Robots](${base}/robots.txt)`,
  ];

  if (settings.rsl.enabled) {
    const price = settings.rsl.priceUsd.replace(/[^0-9.]/g, "") || "0";
    lines.push(
      "",
      "## Licensing",
      `- Content is licensed at $${price} USD per ${settings.rsl.unit} (RSL).`,
    );
  }

  return lines.join("\n") + "\n";
}

/** Strip anything that isn't safe plain text for a single-line heading. */
function plain(value: string): string {
  return value.replace(/[\r\n<>#]/g, "").trim().slice(0, 120);
}

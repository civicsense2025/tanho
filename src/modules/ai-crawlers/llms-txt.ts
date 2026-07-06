import type { AiCrawlersSettings } from "./validation";

/** A key content entry point to advertise in llms.txt. */
export type LlmsLink = { title: string; path: string };

/**
 * Build the llms.txt body (the emerging convention for pointing LLMs at a
 * site's canonical, machine-readable entry points). Plain text only; the site
 * name + link titles are stripped of control/markup characters so nothing
 * arbitrary is echoed into the served file.
 *
 * `keyPages` (content-type indices + top-level pages) are listed so an LLM can
 * discover the site's main sections without crawling the whole sitemap.
 */
export function buildLlmsTxt(
  settings: AiCrawlersSettings,
  siteName: string,
  baseUrl: string,
  keyPages: LlmsLink[] = [],
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

  const links = keyPages
    .map((p) => ({ title: plain(p.title), path: p.path }))
    .filter((p) => p.title && p.path.startsWith("/"));
  if (links.length) {
    lines.push("", "## Key pages");
    for (const p of links) lines.push(`- [${p.title}](${base}${p.path})`);
  }

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

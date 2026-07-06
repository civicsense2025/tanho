import { getAiCrawlersSettings } from "@/modules/ai-crawlers/queries";
import { buildLlmsTxt, type LlmsLink } from "@/modules/ai-crawlers/llms-txt";
import { getGeneralSettings } from "@/modules/settings/queries";
import { getSeoSettings } from "@/modules/seo/queries";
import { getCanonicalSiteUrl } from "@/modules/domain/queries";
import { getContentTypesSettings, isTypeDisabled } from "@/modules/custom-types/content-types-settings";
import { listPublishedTypes } from "@/modules/content-schema/queries";

const BASE_FALLBACK = process.env.APP_URL ?? "http://localhost:3000";

/**
 * GET /llms.txt — serves the generated llms.txt when the feature is enabled
 * (master AI switch AND the llms.txt toggle), otherwise 404. Plain text; the
 * body is built from settings with the site name/price sanitised, plus the
 * enabled content-type index pages as discoverable entry points.
 */
export async function GET(): Promise<Response> {
  const ai = await getAiCrawlersSettings();
  if (!ai.aiEnabled || !ai.llmsTxtEnabled) {
    return new Response("Not found", { status: 404 });
  }

  const [general, seo, contentTypes, publishedTypes] = await Promise.all([
    getGeneralSettings(),
    getSeoSettings(),
    getContentTypesSettings(),
    listPublishedTypes(),
  ]);
  const base = (await getCanonicalSiteUrl(seo.siteUrl, BASE_FALLBACK)).replace(/\/$/, "");

  // Advertise the built-in section indices + each enabled table-backed type's
  // index page. Same disabled-type gate the sitemap uses.
  const keyPages: LlmsLink[] = [];
  if (!isTypeDisabled(contentTypes, "resource")) keyPages.push({ title: "Resources", path: "/resources" });
  for (const type of publishedTypes) {
    if (isTypeDisabled(contentTypes, `custom:${type.slug}`)) continue;
    keyPages.push({ title: type.name ?? type.slug, path: type.basePath });
  }

  const body = buildLlmsTxt(ai, general.name, base, keyPages);

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

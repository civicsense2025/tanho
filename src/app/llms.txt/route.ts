import { getAiCrawlersSettings } from "@/modules/ai-crawlers/queries";
import { buildLlmsTxt } from "@/modules/ai-crawlers/llms-txt";
import { getGeneralSettings } from "@/modules/settings/queries";
import { getSeoSettings } from "@/modules/seo/queries";

const BASE_FALLBACK = process.env.APP_URL ?? "http://localhost:3000";

/**
 * GET /llms.txt — serves the generated llms.txt when the feature is enabled
 * (master AI switch AND the llms.txt toggle), otherwise 404. Plain text; the
 * body is built from settings with the site name/price sanitised.
 */
export async function GET(): Promise<Response> {
  const ai = await getAiCrawlersSettings();
  if (!ai.aiEnabled || !ai.llmsTxtEnabled) {
    return new Response("Not found", { status: 404 });
  }

  const [general, seo] = await Promise.all([
    getGeneralSettings(),
    getSeoSettings(),
  ]);
  const base = (seo.siteUrl || BASE_FALLBACK).replace(/\/$/, "");
  const body = buildLlmsTxt(ai, general.name, base);

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

import { getCredentials } from "@/modules/integrations";
import { getAiCrawlersSettings } from "@/modules/ai-crawlers/queries";
import type { AiAdapter } from "./types";
import { AnthropicAdapter } from "./anthropic";
import { OpenAiAdapter } from "./openai";
import { OpenAiCompatibleAdapter } from "./openai-compatible";
import { NullAiAdapter } from "./null";

/**
 * Selects the live AI adapter for this deployment. SERVER-ONLY (imports the
 * integrations module, which touches the DB and decrypts secrets) — never
 * import this from a client component.
 *
 * Precedence: the ai-crawlers "provider.which" setting picks the provider
 * family; a DB-stored BYO key (integration_connections, provider "ai") wins
 * over the ANTHROPIC_API_KEY / OPENAI_API_KEY env fallback. "builtin" or no
 * key anywhere → NullAiAdapter, so a fresh clone with zero configuration
 * never attempts a network call.
 */
export async function getAiAdapter(): Promise<AiAdapter> {
  const { provider } = await getAiCrawlersSettings();
  if (provider.which === "builtin") return new NullAiAdapter();

  const conn = await getCredentials("ai");
  const dbKey = conn?.kind === "api-key" ? conn.apiKey : undefined;
  const dbBaseUrl = conn?.kind === "api-key" ? conn.baseUrl : undefined;

  if (provider.which === "anthropic") {
    const apiKey = dbKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return new NullAiAdapter();
    return new AnthropicAdapter(apiKey, provider.model || undefined);
  }

  if (provider.which === "openai") {
    const apiKey = dbKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) return new NullAiAdapter();
    return new OpenAiAdapter(apiKey, provider.model || undefined);
  }

  if (provider.which === "custom") {
    // Custom endpoints have no env fallback — the base URL is deployment
    // specific and only meaningful once entered in the admin.
    if (!dbKey || !dbBaseUrl) return new NullAiAdapter();
    return new OpenAiCompatibleAdapter(dbKey, dbBaseUrl, provider.model);
  }

  return new NullAiAdapter();
}

/** Cheap boolean check for gating UI/actions without running a completion. */
export async function aiConfigured(): Promise<boolean> {
  const adapter = await getAiAdapter();
  return adapter.isConfigured();
}

export type { AiAdapter, AiCompleteInput } from "./types";

/**
 * Minimal BYO AI adapter contract — text in, text out. Every provider
 * (Anthropic, OpenAI, an OpenAI-compatible custom endpoint, or the null
 * adapter used when nothing is configured) implements this shape so callers
 * in src/modules/ai-crawlers/authoring.ts never branch on provider.
 */
export type AiCompleteInput = {
  /** Optional system/instruction prompt. */
  system?: string;
  /** The user prompt. */
  prompt: string;
  /** Upper bound on generated tokens; adapters apply a sane default. */
  maxTokens?: number;
};

export interface AiAdapter {
  /** Cheap, synchronous-ish check — is there a usable key for this adapter? */
  isConfigured(): boolean | Promise<boolean>;
  /** Run one completion. Throws on missing config or a provider-side error. */
  complete(input: AiCompleteInput): Promise<string>;
}

import type { AiAdapter, AiCompleteInput } from "./types";

/** Cheap default for short authoring tasks (alt text, SEO, summaries). */
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_MAX_TOKENS = 512;

type MessagesResponse = {
  content?: Array<{ type: string; text?: string }>;
};

/** BYO Anthropic adapter — direct fetch to the Messages API, no SDK. */
export class AnthropicAdapter implements AiAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = DEFAULT_MODEL,
  ) {}

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async complete({ system, prompt, maxTokens }: AiCompleteInput): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("AI not configured — missing Anthropic API key.");
    }
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model || DEFAULT_MODEL,
        max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
        ...(system ? { system } : {}),
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Anthropic request failed (${res.status}): ${detail.slice(0, 300)}`);
    }
    const data = (await res.json()) as MessagesResponse;
    const text = data.content?.find((b) => b.type === "text")?.text;
    if (!text) throw new Error("Anthropic response had no text content.");
    return text;
  }
}

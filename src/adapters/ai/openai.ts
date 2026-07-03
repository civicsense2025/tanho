import type { AiAdapter, AiCompleteInput } from "./types";

/** Cheap default for short authoring tasks. */
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_MAX_TOKENS = 512;
const DEFAULT_BASE_URL = "https://api.openai.com/v1";

type ChatCompletionsResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

/**
 * BYO OpenAI adapter — direct fetch to the Chat Completions API, no SDK.
 * `baseUrl` is exposed (not just hardcoded) so OpenAiCompatibleAdapter can
 * extend this with a custom endpoint instead of duplicating the request shape.
 */
export class OpenAiAdapter implements AiAdapter {
  protected readonly baseUrl: string;

  constructor(
    protected readonly apiKey: string,
    protected readonly model: string = DEFAULT_MODEL,
    baseUrl: string = DEFAULT_BASE_URL,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async complete({ system, prompt, maxTokens }: AiCompleteInput): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("AI not configured — missing OpenAI API key.");
    }
    const messages = [
      ...(system ? [{ role: "system", content: system }] : []),
      { role: "user", content: prompt },
    ];
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model || DEFAULT_MODEL,
        max_tokens: maxTokens ?? DEFAULT_MAX_TOKENS,
        messages,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`OpenAI request failed (${res.status}): ${detail.slice(0, 300)}`);
    }
    const data = (await res.json()) as ChatCompletionsResponse;
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("OpenAI response had no message content.");
    return text;
  }
}

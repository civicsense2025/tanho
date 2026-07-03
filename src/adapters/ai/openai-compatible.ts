import { OpenAiAdapter } from "./openai";

/**
 * "custom" provider — any self-hosted or third-party OpenAI-compatible chat
 * completions endpoint (vLLM, LM Studio, OpenRouter, Azure OpenAI gateways,
 * etc.). Identical request/response shape to OpenAiAdapter; the only
 * difference is the connection's `baseUrl` is required, not the OpenAI
 * default.
 */
export class OpenAiCompatibleAdapter extends OpenAiAdapter {
  constructor(apiKey: string, baseUrl: string, model: string) {
    super(apiKey, model, baseUrl);
  }
}

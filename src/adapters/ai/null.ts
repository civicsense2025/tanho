import type { AiAdapter } from "./types";

/**
 * No-op adapter used when the "builtin" provider is selected or no key is
 * connected. `isConfigured()` is always false so callers gate on it and
 * never reach `complete()` in the unconfigured state — this throw is a
 * backstop, not the primary gate.
 */
export class NullAiAdapter implements AiAdapter {
  isConfigured(): boolean {
    return false;
  }

  complete(): Promise<string> {
    throw new Error(
      "AI not configured — connect an AI provider in Settings → AI & crawlers.",
    );
  }
}

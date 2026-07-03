"use server";

import { z } from "zod";
import { updateTag } from "next/cache";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import {
  saveConnection,
  disconnectIntegration,
  connectionSummary,
  type ConnectionSummary,
} from "@/modules/integrations";
import type { AiAdapter } from "@/adapters/ai/types";
import { AnthropicAdapter } from "@/adapters/ai/anthropic";
import { OpenAiAdapter } from "@/adapters/ai/openai";
import { OpenAiCompatibleAdapter } from "@/adapters/ai/openai-compatible";
import { getAiCrawlersSettings } from "./queries";

/**
 * Owner-only key entry for the BYO "ai" integration connection. Kept in
 * ai-crawlers (not modules/integrations, which is read-only for this
 * feature) since this is the one screen that collects the key. The actual
 * sealing/storage goes through the shared integrations writer.
 */

const saveAiKeyInput = z.object({
  apiKey: z.string().trim().min(1, "API key is required").max(500),
  baseUrl: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
});

export type SaveAiKeyState = { ok?: boolean; error?: string };

/** Builds a live adapter for the just-submitted key, without reading anything back from the DB — the key isn't persisted yet. */
function adapterForSubmittedKey(which: string, apiKey: string, baseUrl: string | undefined): AiAdapter | null {
  if (which === "anthropic") return new AnthropicAdapter(apiKey);
  if (which === "openai") return new OpenAiAdapter(apiKey);
  if (which === "custom") {
    if (!baseUrl) return null;
    return new OpenAiCompatibleAdapter(apiKey, baseUrl, "");
  }
  return null;
}

export async function saveAiKey(input: unknown): Promise<SaveAiKeyState> {
  const user = await requireUser("owner");
  const parsed = saveAiKeyInput.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { apiKey, baseUrl } = parsed.data;
  const { provider } = await getAiCrawlersSettings();

  const adapter = adapterForSubmittedKey(provider.which, apiKey, baseUrl || undefined);
  if (adapter) {
    try {
      await adapter.complete({ prompt: "Reply with the single word: ok", maxTokens: 5 });
    } catch (err) {
      console.error("[ai-crawlers] saveAiKey verification failed", err instanceof Error ? err.message : "unknown error");
      return { error: "Could not verify this key. Check it's correct and try again." };
    }
  }

  await saveConnection({
    provider: "ai",
    credentials: {
      kind: "api-key",
      apiKey,
      ...(baseUrl ? { baseUrl } : {}),
    },
    accountLabel: `${provider.which}-provider`,
  });
  updateTag("integration:ai");
  await writeAudit({
    userId: user.id,
    action: "ai.key.save",
    ownerType: "integration",
    ownerId: "ai",
  });
  return { ok: true };
}

export async function disconnectAiKey(): Promise<SaveAiKeyState> {
  const res = await disconnectIntegration("ai");
  return res.ok ? { ok: true } : { error: res.error };
}

export async function getAiConnectionSummary(): Promise<ConnectionSummary | null> {
  await requireUser("owner");
  return connectionSummary("ai");
}

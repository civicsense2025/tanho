"use server";

import { saveSettings, type SaveSettingsState } from "@/modules/settings/actions";

/**
 * Save the AI & crawlers settings. Thin wrapper over the shared owner-gated,
 * zod-validated settings writer (namespace "ai_crawlers" is registered in
 * modules/settings/validation.ts). Kept as a named action so the admin screen
 * imports from its own module.
 */
export async function saveAiCrawlers(data: unknown): Promise<SaveSettingsState> {
  return saveSettings("ai_crawlers", data);
}

import { readSettingRow } from "@/modules/settings/queries";
import {
  AVAILABILITY_DEFAULTS,
  EXTENSIONS_DEFAULTS,
  TEMPLATES_DEFAULTS,
  availabilitySettingsSchema,
  extensionsSchema,
  templatesSchema,
  type AvailabilitySettings,
  type ExtensionsSettings,
  type TemplatesSettings,
} from "./validation";

/**
 * Scheduling settings live in the shared `settings` table under three
 * namespaces. These readers parse the stored JSON and fall back to neutral
 * defaults so the module works before seeding. The namespaces are registered
 * into the settings allowlist from modules/settings/validation.ts.
 */
export const SCHED_NS = "scheduling";
export const SCHED_EXT_NS = "sched_extensions";
export const SCHED_TPL_NS = "sched_templates";

export async function getAvailabilitySettings(): Promise<AvailabilitySettings> {
  const parsed = availabilitySettingsSchema.safeParse(await readSettingRow(SCHED_NS));
  return parsed.success ? parsed.data : AVAILABILITY_DEFAULTS;
}

export async function getExtensionsSettings(): Promise<ExtensionsSettings> {
  const parsed = extensionsSchema.safeParse(await readSettingRow(SCHED_EXT_NS));
  return parsed.success ? parsed.data : EXTENSIONS_DEFAULTS;
}

export async function getTemplatesSettings(): Promise<TemplatesSettings> {
  const parsed = templatesSchema.safeParse(await readSettingRow(SCHED_TPL_NS));
  return parsed.success ? parsed.data : TEMPLATES_DEFAULTS;
}

/** Whether a named extension is toggled on (defaults false when absent). */
export function extensionOn(ext: ExtensionsSettings, id: string): boolean {
  return ext.items.find((e) => e.id === id)?.on ?? false;
}

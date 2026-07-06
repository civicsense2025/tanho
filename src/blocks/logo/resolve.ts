import { getGeneralSettings } from "@/modules/settings/queries";
import type { LogoContent } from "./fields";

export type LogoResolved = { siteName: string };

/**
 * Server-only: the effective site name for the white-label fallback. The block
 * stores an empty `text` to mean "use the site name"; resolving it here (rather
 * than baking a name into the tree) keeps a rebrand a pure data change — the
 * same reasoning the old ChromeHeader used when it read general settings.
 */
export async function resolveLogo(_content: LogoContent): Promise<LogoResolved> {
  const general = await getGeneralSettings();
  return { siteName: general.name };
}

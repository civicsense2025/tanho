import { getGeneralSettings } from "@/modules/settings/queries";
import type { SiteHeaderContent } from "./fields";

export type SiteHeaderResolved = { utilityText: string };

/**
 * Server-only: the effective two-tier utility-strip text. `content.utilityText`
 * wins when set; empty falls back to the site's general tagline — the same
 * white-label pattern logo/site-footer use, so a brand default is never stored
 * in the tree. Registered as a resolver but the def is NOT `bound`, so the
 * header's own fields stay editable (the `table` pattern).
 */
export async function resolveSiteHeader(content: SiteHeaderContent): Promise<SiteHeaderResolved> {
  if (content.utilityText) return { utilityText: content.utilityText };
  const general = await getGeneralSettings();
  return { utilityText: general.tagline };
}

import { cacheLife } from "next/cache";
import { getGeneralSettings } from "@/modules/settings/queries";
import type { SiteFooterContent } from "./fields";

export type SiteFooterResolved = { siteName: string; year: number };

/**
 * Current year for the derived copyright line. Cache Components treats
 * `new Date()` as dynamic, so it's cached with a daily lifetime — the footer
 * stays in the static shell and the year is correct within a day. (Ported from
 * the old chrome getCurrentYear.)
 */
async function currentYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

/**
 * Server-only: the effective site name + current year for the auto copyright
 * line. Registered as a resolver but the def is NOT `bound`, so the footer's
 * own fields (layout/dark/copyright) stay editable (the `table` pattern).
 */
export async function resolveSiteFooter(_content: SiteFooterContent): Promise<SiteFooterResolved> {
  const [general, year] = await Promise.all([getGeneralSettings(), currentYear()]);
  return { siteName: general.name, year };
}

import { getGeneralSettings } from "@/modules/settings/queries";
import { getTheme } from "@/modules/theme/queries";
import { mediaPublicUrl } from "@/modules/fonts/queries";
import { getCanonicalSiteUrl } from "@/modules/domain/queries";
import { getSeoSettings } from "../queries";
import { JsonLd } from "../JsonLdScript";
import { organization, webSite } from "./site";

const BASE_FALLBACK = process.env.APP_URL ?? "http://localhost:3000";

/**
 * Site-level Organization + WebSite (with SearchAction) JSON-LD, emitted once
 * from the public layout. Skipped entirely when the site is not indexable so a
 * private site advertises no identity. All inputs come from settings/theme —
 * never hardcoded.
 */
export async function SiteJsonLd() {
  const [general, seo] = await Promise.all([getGeneralSettings(), getSeoSettings()]);
  if (!general.indexable) return null;

  const [siteUrl, theme] = await Promise.all([
    getCanonicalSiteUrl(seo.siteUrl, BASE_FALLBACK),
    getTheme(),
  ]);
  const logoUrl = await mediaPublicUrl(theme.faviconMediaId);
  const ctx = { siteName: general.name, siteUrl };

  return (
    <>
      <JsonLd schema={organization(ctx, { logoUrl, sameAs: seo.socialProfiles })} />
      <JsonLd schema={webSite(ctx)} />
    </>
  );
}

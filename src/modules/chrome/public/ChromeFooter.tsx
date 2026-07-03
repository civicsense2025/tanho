import { getGeneralSettings } from "@/modules/settings/queries";
import { getMenus } from "@/modules/menus/queries";
import { getCurrentYear, getFooterConfig } from "../queries";
import { FooterBar } from "./FooterBar";

/**
 * Server wrapper: resolves the footer config's menu references against the
 * cached menus and passes plain props to the presentational composer.
 * The copyright year is computed here — an empty stored copyright renders
 * "© {currentYear} {siteName}".
 */
export async function ChromeFooter() {
  const [config, menus, general, year] = await Promise.all([
    getFooterConfig(),
    getMenus(),
    getGeneralSettings(),
    getCurrentYear(),
  ]);
  const byId = new Map(menus.map((m) => [m.id, m]));
  const columns = config.columns.map((c) => ({
    title: c.title,
    items: byId.get(c.menuId)?.items ?? [],
  }));
  const social = byId.get(config.socialMenuId)?.items ?? [];
  return (
    <FooterBar
      config={config}
      columns={columns}
      social={social}
      siteName={general.name}
      tagline={general.tagline}
      year={year}
    />
  );
}

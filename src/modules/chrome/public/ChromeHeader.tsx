import { getGeneralSettings } from "@/modules/settings/queries";
import { getMenus } from "@/modules/menus/queries";
import { getHeaderConfig } from "../queries";
import { HeaderBar } from "./HeaderBar";

/**
 * Server wrapper: reads the cached header config + menus + site identity
 * and hands plain props to the presentational composer (which the admin
 * preview also renders with live form state).
 */
export async function ChromeHeader() {
  const [config, menus, general] = await Promise.all([
    getHeaderConfig(),
    getMenus(),
    getGeneralSettings(),
  ]);
  // Empty/missing menuId degrades gracefully to the first menu (or none).
  const menu = menus.find((m) => m.id === config.menuId) ?? menus[0];
  return (
    <HeaderBar
      config={config}
      items={menu?.items ?? []}
      siteName={general.name}
      tagline={general.tagline}
    />
  );
}

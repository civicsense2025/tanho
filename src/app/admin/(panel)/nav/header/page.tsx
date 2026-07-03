import { requireUser } from "@/modules/auth/guards";
import { getGeneralSettings } from "@/modules/settings/queries";
import { listMenus } from "@/modules/menus/queries";
import { getHeaderConfig } from "@/modules/chrome/queries";
import { NavTabs } from "@/modules/chrome/admin/NavTabs";
import { HeaderScreen } from "@/modules/chrome/admin/HeaderScreen";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Header" };

export default async function NavHeaderPage() {
  await requireUser("owner");
  const [config, menus, general] = await Promise.all([
    getHeaderConfig(),
    listMenus(),
    getGeneralSettings(),
  ]);
  return (
    <AdminPage>
      <h1 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never, letterSpacing: "var(--tracking-tight)" }}>
        Header
      </h1>
      <NavTabs />
      <HeaderScreen initial={config} menus={menus} siteName={general.name} tagline={general.tagline} />
    </AdminPage>
  );
}

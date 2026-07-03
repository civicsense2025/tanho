import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { getGeneralSettings } from "@/modules/settings/queries";
import { listMenus } from "@/modules/menus/queries";
import { getFooterConfig } from "@/modules/chrome/queries";
import { NavTabs } from "@/modules/chrome/admin/NavTabs";
import { FooterScreen } from "@/modules/chrome/admin/FooterScreen";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Footer" };

export default function NavFooterPage() {
  return (
    <Suspense fallback={null}>
      <NavFooterPageInner />
    </Suspense>
  );
}

async function NavFooterPageInner() {
  await requireUser("owner");
  const [config, menus, general] = await Promise.all([
    getFooterConfig(),
    listMenus(),
    getGeneralSettings(),
  ]);
  return (
    <AdminPage>
      <h1 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never, letterSpacing: "var(--tracking-tight)" }}>
        Footer
      </h1>
      <NavTabs />
      <FooterScreen initial={config} menus={menus} siteName={general.name} tagline={general.tagline} />
    </AdminPage>
  );
}

import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { listMenus } from "@/modules/menus/queries";
import { NavTabs } from "@/modules/chrome/admin/NavTabs";
import { MenusScreen } from "@/modules/menus/admin/MenusScreen";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Menus" };

export default function NavMenusPage() {
  return (
    <Suspense fallback={null}>
      <NavMenusPageInner />
    </Suspense>
  );
}

async function NavMenusPageInner() {
  await requireUser("owner");
  const menus = await listMenus();
  return (
    <AdminPage>
      <h1 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never, letterSpacing: "var(--tracking-tight)" }}>
        Menus
      </h1>
      <NavTabs />
      <MenusScreen menus={menus} />
    </AdminPage>
  );
}

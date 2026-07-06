import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/modules/auth/guards";
import { listMenus } from "@/modules/menus/queries";
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
      <p style={{ margin: "0 0 var(--space-6)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        Menus feed the <Link href="/admin/nav/header" style={{ color: "var(--accent)" }}>header</Link> and{" "}
        <Link href="/admin/nav/footer" style={{ color: "var(--accent)" }}>footer</Link> nav blocks.
      </p>
      <MenusScreen menus={menus} />
    </AdminPage>
  );
}

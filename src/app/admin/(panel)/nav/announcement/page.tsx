import { requireUser } from "@/modules/auth/guards";
import { getAnnouncementConfig } from "@/modules/chrome/queries";
import { NavTabs } from "@/modules/chrome/admin/NavTabs";
import { AnnouncementScreen } from "@/modules/chrome/admin/AnnouncementScreen";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Announcement bar" };

export default async function NavAnnouncementPage() {
  await requireUser("owner");
  const config = await getAnnouncementConfig();
  return (
    <AdminPage>
      <h1 style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never, letterSpacing: "var(--tracking-tight)" }}>
        Announcement bar
      </h1>
      <NavTabs />
      <AnnouncementScreen initial={config} />
    </AdminPage>
  );
}

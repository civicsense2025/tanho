import { requireUser } from "@/modules/auth/guards";
import { listEntries } from "@/modules/entries/queries";
import { ContentScreen } from "@/modules/entries/admin/ContentScreen";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Guides" };

export default async function Page() {
  await requireUser();
  const items = await listEntries("guide");
  return (
    <AdminPage>
      <ContentScreen entity="guide" items={items} />
    </AdminPage>
  );
}

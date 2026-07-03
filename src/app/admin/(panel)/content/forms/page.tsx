import { requireUser } from "@/modules/auth/guards";
import { listForms } from "@/modules/forms/queries";
import { FormsScreen } from "@/modules/forms/admin/FormsScreen";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Forms" };

export default async function Page() {
  await requireUser();
  const items = await listForms();
  return (
    <AdminPage>
      <FormsScreen items={items} />
    </AdminPage>
  );
}

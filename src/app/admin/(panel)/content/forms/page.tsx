import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { listForms } from "@/modules/forms/queries";
import { FormsScreen } from "@/modules/forms/admin/FormsScreen";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Forms" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageInner />
    </Suspense>
  );
}

async function PageInner() {
  await requireUser();
  const items = await listForms();
  return (
    <AdminPage>
      <FormsScreen items={items} />
    </AdminPage>
  );
}

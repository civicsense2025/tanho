import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/guards";
import { AdminPage } from "@/components/admin/AdminPage";
import { getTableBackedType, listTypeRowsForAdmin } from "@/modules/content-schema/admin-queries";
import { ContentRowsScreen } from "@/modules/content-schema/admin/ContentRowsScreen";

export const metadata = { title: "Content rows" };

export default function ContentRowsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <Inner params={params} />
    </Suspense>
  );
}

async function Inner({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("owner");
  const { id } = await params;
  const type = await getTableBackedType(id);
  if (!type) notFound();
  const rows = await listTypeRowsForAdmin(type);
  return (
    <AdminPage>
      <ContentRowsScreen
        typeId={type.id}
        typeName={type.name}
        basePath={type.basePath}
        fields={type.fields}
        rows={rows}
      />
    </AdminPage>
  );
}

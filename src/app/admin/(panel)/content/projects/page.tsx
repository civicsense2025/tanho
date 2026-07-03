import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/guards";
import { listEntries } from "@/modules/entries/queries";
import { getEntitySchema } from "@/entities/registry-async";
import { toEntitySchemaSummary } from "@/entities/types";
import { ContentScreen } from "@/modules/entries/admin/ContentScreen";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Projects" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageInner />
    </Suspense>
  );
}

async function PageInner() {
  await requireUser();
  const schema = await getEntitySchema("project");
  if (!schema) notFound();
  const items = await listEntries("project");
  return (
    <AdminPage>
      <ContentScreen schema={toEntitySchemaSummary(schema)} items={items} />
    </AdminPage>
  );
}

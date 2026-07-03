import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { CreateConnectionForm } from "@/modules/data-sources/admin/CreateConnectionForm";
import { SettingsShell } from "@/components/admin/SettingsShell";

export const metadata = { title: "Connect a database" };

export default function NewDataSourcePage() {
  return (
    <Suspense fallback={null}>
      <NewDataSourcePageInner />
    </Suspense>
  );
}

async function NewDataSourcePageInner() {
  await requireUser("owner");
  return (
    <SettingsShell title="Connect a database" subtitle="Postgres or Supabase — credentials are encrypted at rest.">
      <CreateConnectionForm />
    </SettingsShell>
  );
}

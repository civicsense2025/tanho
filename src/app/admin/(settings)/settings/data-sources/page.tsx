import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { listConnections } from "@/modules/data-sources/queries";
import { ConnectionsScreen } from "@/modules/data-sources/admin/ConnectionsScreen";
import { SettingsShell } from "@/components/admin/SettingsShell";
import { isSupabaseOAuthConfigured } from "@/adapters/supabase-oauth/config";

export const metadata = { title: "Data sources" };

export default function DataSourcesSettingsPage() {
  return (
    <Suspense fallback={null}>
      <DataSourcesSettingsPageInner />
    </Suspense>
  );
}

async function DataSourcesSettingsPageInner() {
  await requireUser("owner");
  const connections = await listConnections();
  return (
    <SettingsShell title="Data sources" subtitle="External database connections for live blocks.">
      <ConnectionsScreen connections={connections} isSupabaseOAuthConfigured={isSupabaseOAuthConfigured()} />
    </SettingsShell>
  );
}

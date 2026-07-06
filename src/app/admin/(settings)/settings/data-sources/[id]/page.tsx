import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/guards";
import { getConnectionSummary } from "@/modules/data-sources/queries";
import { AllowlistEditor } from "@/modules/data-sources/admin/AllowlistEditor";
import { SettingsShell } from "@/components/admin/SettingsShell";

export const metadata = { title: "Data source connection" };

export default function DataSourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <DataSourceDetailPageInner params={params} />
    </Suspense>
  );
}

async function DataSourceDetailPageInner({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser("owner");
  const { id } = await params;
  const connection = await getConnectionSummary(id);
  if (!connection) notFound();

  return (
    <SettingsShell title={connection.name} subtitle={`${connection.provider} · ${connection.status}`}>
      <AllowlistEditor connectionId={connection.id} initialAllowlist={connection.allowlistJson} />
    </SettingsShell>
  );
}

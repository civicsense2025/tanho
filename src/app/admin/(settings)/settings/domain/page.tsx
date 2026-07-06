import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { getDomainSettings } from "@/modules/domain/queries";
import { DomainForm } from "@/modules/domain/admin/DomainForm";
import { SettingsShell } from "@/components/admin/SettingsShell";

export const metadata = { title: "Domain settings" };

export default function DomainSettingsPage() {
  return (
    <Suspense fallback={null}>
      <DomainSettingsPageInner />
    </Suspense>
  );
}

async function DomainSettingsPageInner() {
  await requireUser("owner");
  const domain = await getDomainSettings();
  return (
    <SettingsShell title="Domain" subtitle="Connect a custom domain and check its DNS setup.">
      <DomainForm initial={domain} appUrl={process.env.APP_URL ?? "http://localhost:3000"} />
    </SettingsShell>
  );
}

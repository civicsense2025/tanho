import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { getMarketplaceSettings } from "@/modules/marketplace/queries";
import { MarketplaceForm } from "@/modules/marketplace/admin/MarketplaceForm";
import { SettingsShell } from "@/components/admin/SettingsShell";

export const metadata = { title: "Marketplace" };

export default function MarketplaceSettingsPage() {
  return (
    <Suspense fallback={null}>
      <MarketplaceSettingsPageInner />
    </Suspense>
  );
}

async function MarketplaceSettingsPageInner() {
  await requireUser("owner");
  const settings = await getMarketplaceSettings();
  return (
    <SettingsShell
      title="Marketplace"
      subtitle="Enable and configure your pack marketplace."
    >
      <MarketplaceForm initial={settings} />
    </SettingsShell>
  );
}

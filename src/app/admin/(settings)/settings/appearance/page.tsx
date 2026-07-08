import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { getAppearanceSettings } from "@/modules/settings/queries";
import { AppearanceForm } from "@/modules/settings/admin/AppearanceForm";
import { SettingsShell } from "@/components/admin/SettingsShell";

export const metadata = { title: "Appearance" };

export default function AppearanceSettingsPage() {
  return (
    <Suspense fallback={null}>
      <AppearanceSettingsPageInner />
    </Suspense>
  );
}

async function AppearanceSettingsPageInner() {
  await requireUser("owner");
  const appearance = await getAppearanceSettings();
  return (
    <SettingsShell title="Appearance" subtitle="Choose the default theme mode for your site — light, dark, or follow the visitor's system.">
      <AppearanceForm initial={appearance} />
    </SettingsShell>
  );
}

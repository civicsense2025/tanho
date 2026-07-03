import { requireUser } from "@/modules/auth/guards";
import { getGeneralSettings } from "@/modules/settings/queries";
import { GeneralForm } from "@/modules/settings/admin/GeneralForm";
import { SettingsShell } from "@/components/admin/SettingsShell";

export const metadata = { title: "General settings" };

export default async function GeneralSettingsPage() {
  await requireUser("owner");
  const general = await getGeneralSettings();
  return (
    <SettingsShell title="General" subtitle="Your site's name, tagline, locale, and search-engine visibility.">
      <GeneralForm initial={general} />
    </SettingsShell>
  );
}

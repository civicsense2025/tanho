import { requireUser } from "@/modules/auth/guards";
import { getPeopleSettings } from "@/modules/people/people-settings";
import { PeopleSettingsForm } from "@/modules/people/admin/PeopleSettingsForm";
import { SettingsShell } from "@/components/admin/SettingsShell";

export const metadata = { title: "People settings" };

export default async function PeopleSettingsPage() {
  await requireUser("owner");
  const settings = await getPeopleSettings();
  return (
    <SettingsShell title="People" subtitle="Sign-ups, profiles, subscriptions, and privacy.">
      <PeopleSettingsForm initial={settings} />
    </SettingsShell>
  );
}

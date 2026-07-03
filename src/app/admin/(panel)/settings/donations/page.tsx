import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { getDonationsSettings } from "@/modules/donations/donations-settings";
import { DonationsForm } from "@/modules/donations/admin/DonationsForm";
import { SettingsShell } from "@/components/admin/SettingsShell";

export const metadata = { title: "Donations settings" };

export default function DonationsSettingsPage() {
  return (
    <Suspense fallback={null}>
      <DonationsSettingsPageInner />
    </Suspense>
  );
}

async function DonationsSettingsPageInner() {
  await requireUser("owner");
  const donations = await getDonationsSettings();
  return (
    <SettingsShell title="Donations" subtitle="Accept one-time, pay-what-you-want donations.">
      <DonationsForm initial={donations} />
    </SettingsShell>
  );
}

import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { payments } from "@/adapters/payments";
import { readMembershipSettings } from "@/modules/memberships/tiers";
import { MembershipSettingsScreen } from "@/modules/memberships/admin/MembershipSettingsScreen";
import { SettingsShell } from "@/components/admin/SettingsShell";

export const metadata = { title: "Membership settings" };

export default function MembershipSettingsPage() {
  return (
    <Suspense fallback={null}>
      <MembershipSettingsPageInner />
    </Suspense>
  );
}

async function MembershipSettingsPageInner() {
  await requireUser("owner");
  const initial = await readMembershipSettings();
  return (
    <SettingsShell title="Membership" subtitle="Paid tiers and the self-serve billing portal.">
      <MembershipSettingsScreen initial={initial} connected={payments.isConfigured()} />
    </SettingsShell>
  );
}

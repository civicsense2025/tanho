import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireViewer } from "@/modules/people/session";
import { emailSubscriptions, memberships } from "@/modules/people/schema";
import { getPeopleSettings } from "@/modules/people/people-settings";
import { AccountPanel, type AccountData } from "@/modules/people/public/AccountPanel";

export const metadata = { title: "Your account" };

/** Reader account page — resolves ONLY the current viewer's own data. */
export default async function AccountPage() {
  const viewer = await requireViewer();
  const settings = await getPeopleSettings();

  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.personId, viewer.personId),
      eq(memberships.status, "active"),
    ),
  });
  const subs = await db.query.emailSubscriptions.findMany({
    where: eq(emailSubscriptions.personId, viewer.personId),
  });

  const data: AccountData = {
    name: viewer.name,
    email: viewer.email,
    memberActive: viewer.memberActive,
    tier: viewer.tier,
    since: membership?.since ?? null,
    currentPeriodEnd: membership?.currentPeriodEnd ?? null,
    subscriptions: subs.map((s) => ({ list: s.list, status: s.status })),
    selfExport: settings.selfExport,
  };

  return (
    <main
      style={{
        maxWidth: "40rem",
        margin: "0 auto",
        padding: "var(--space-10) var(--gutter) var(--space-12)",
      }}
    >
      <AccountPanel data={data} />
    </main>
  );
}

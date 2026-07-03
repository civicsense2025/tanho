import { requireUser } from "@/modules/auth/guards";
import { getAnalyticsSettings } from "@/modules/analytics/settings";
import { eventsOverTime } from "@/modules/analytics/queries";
import { getAnalyticsRead } from "@/adapters/analytics";
import { isGoogleOAuthConfigured } from "@/adapters/google/config";
import { isConnected } from "@/modules/integrations";
import { OverviewScreen } from "@/modules/analytics/admin/OverviewScreen";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Analytics" };

/** Analytics → Overview. Editor-viewable; the connect action is owner-only. */
export default async function AnalyticsOverviewPage() {
  const user = await requireUser();
  const read = await getAnalyticsRead();
  const [settings, connected, kpis, overTime] = await Promise.all([
    getAnalyticsSettings(),
    isConnected("google-analytics"),
    read.overview(30),
    eventsOverTime(14),
  ]);

  return (
    <AdminPage>
      <h1
        style={{
          margin: "0 0 var(--space-6)",
          fontSize: "var(--text-h2)",
          fontWeight: "var(--weight-medium)" as never,
          letterSpacing: "var(--tracking-tight)",
        }}
      >
        Overview
      </h1>
      <OverviewScreen
        connected={connected}
        isOwner={user.role === "owner"}
        isGoogleOAuthConfigured={isGoogleOAuthConfigured()}
        ga4PropertyId={settings.ga4PropertyId}
        overview={kpis}
        overTime={overTime}
      />
    </AdminPage>
  );
}

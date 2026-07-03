import { Suspense } from "react";
import { requireUser } from "@/modules/auth/guards";
import { getAnalyticsSettings } from "@/modules/analytics/settings";
import { getAnalyticsRead } from "@/adapters/analytics";
import { isGoogleOAuthConfigured } from "@/adapters/google/config";
import { isConnected } from "@/modules/integrations";
import { TrafficScreen } from "@/modules/analytics/admin/TrafficScreen";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata = { title: "Traffic" };

/** Analytics → Traffic. Editor-viewable; the connect action is owner-only. */
export default function AnalyticsTrafficPage() {
  return (
    <Suspense fallback={null}>
      <AnalyticsTrafficPageInner />
    </Suspense>
  );
}

async function AnalyticsTrafficPageInner() {
  const user = await requireUser();
  const read = await getAnalyticsRead();
  const [settings, connected, pages, queries] = await Promise.all([
    getAnalyticsSettings(),
    isConnected("google-search-console"),
    read.topPages(30, 20),
    read.topQueries(30, 20),
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
        Traffic
      </h1>
      <TrafficScreen
        connected={connected}
        isOwner={user.role === "owner"}
        isGoogleOAuthConfigured={isGoogleOAuthConfigured()}
        gscSiteUrl={settings.gscSiteUrl}
        pages={pages}
        queries={queries}
      />
    </AdminPage>
  );
}

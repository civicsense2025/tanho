import { Section } from "@/components/admin/Section";
import type { AnalyticsOverview, DayBucket } from "../queries";
import { ConnectGate, DisconnectButton } from "./ConnectGate";
import { KpiCards } from "./KpiCards";
import { BarChart } from "./BarChart";
import { GoogleConfigField } from "./GaConfigForm";
import { disconnectGa, saveGa4PropertyId } from "../connect-actions";
import styles from "./analytics.module.css";

/**
 * Analytics Overview. Shows the real Google OAuth connect gate when GA4
 * isn't connected; once connected, shows the GA4 property id config (needed
 * before the ga4 adapter can query real data) and the KPI/chart dashboard.
 * KPIs/chart come from whichever adapter adapters/analytics selected —
 * ga4 when configured+connected+property set, internal otherwise/on failure.
 */
export function OverviewScreen({
  connected,
  isOwner,
  isGoogleOAuthConfigured,
  ga4PropertyId,
  overview,
  overTime,
  productionUrl: _productionUrl,
}: {
  connected: boolean;
  isOwner: boolean;
  isGoogleOAuthConfigured: boolean;
  ga4PropertyId: string;
  overview: AnalyticsOverview;
  overTime: DayBucket[];
  productionUrl?: string;
}) {
  if (!connected) {
    return (
      <ConnectGate
        title="Connect Google Analytics"
        body="Connect an analytics source to see visitor trends here. Your site already collects first-party events — connecting unlocks this dashboard."
        connectLabel="Connect Google Analytics"
        startHref="/api/oauth/google/google-analytics"
        isOwner={isOwner}
        isGoogleOAuthConfigured={isGoogleOAuthConfigured}
        service="google-analytics"
        productionUrl={_productionUrl}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div className={styles.connected}>
        <span className={styles.dot} aria-hidden />
        Analytics connected · last {overview.windowDays} days
        {isOwner ? (
          <span style={{ marginLeft: "auto" }}>
            <DisconnectButton disconnect={disconnectGa} />
          </span>
        ) : null}
      </div>

      {isOwner ? (
        <GoogleConfigField
          label="GA4 property id"
          placeholder="properties/123456789"
          value={ga4PropertyId}
          save={saveGa4PropertyId}
        />
      ) : null}

      <KpiCards data={overview} />

      <Section title="Page views over time" desc="First-party pageview events, last 14 days.">
        <BarChart data={overTime} />
      </Section>
    </div>
  );
}

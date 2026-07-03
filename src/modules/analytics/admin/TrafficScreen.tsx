import { Section } from "@/components/admin/Section";
import type { PageStat, QueryStat } from "../queries";
import { disconnectGsc, saveGscSiteUrl } from "../connect-actions";
import { median, pageSuggestion } from "../suggestions";
import { ConnectGate, DisconnectButton } from "./ConnectGate";
import { GoogleConfigField } from "./GaConfigForm";
import styles from "./analytics.module.css";

/**
 * Traffic screen. Gated behind a real Search Console OAuth connect. Once
 * connected: the GSC site URL config, top pages (first-party views + per-page
 * suggestion flags), and a search-queries table backed by the ga4 adapter's
 * Search Console query (falls back to empty on any failure).
 */
export function TrafficScreen({
  connected,
  isOwner,
  isGoogleOAuthConfigured,
  gscSiteUrl,
  pages,
  queries,
}: {
  connected: boolean;
  isOwner: boolean;
  isGoogleOAuthConfigured: boolean;
  gscSiteUrl: string;
  pages: PageStat[];
  queries: QueryStat[];
}) {
  if (!connected) {
    return (
      <ConnectGate
        title="Connect Search Console"
        body="Connect Google Search Console to see which pages and search queries bring people to your site, with suggestions to improve each one."
        connectLabel="Connect Search Console"
        startHref="/api/oauth/google/google-search-console"
        isOwner={isOwner}
        isGoogleOAuthConfigured={isGoogleOAuthConfigured}
      />
    );
  }

  const medianViews = median(pages.map((p) => p.views));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div className={styles.connected}>
        <span className={styles.dot} aria-hidden />
        Search Console connected
        {isOwner ? (
          <span style={{ marginLeft: "auto" }}>
            <DisconnectButton disconnect={disconnectGsc} />
          </span>
        ) : null}
      </div>

      {isOwner ? (
        <GoogleConfigField
          label="Search Console site URL"
          placeholder="https://example.com/ or sc-domain:example.com"
          value={gscSiteUrl}
          save={saveGscSiteUrl}
        />
      ) : null}

      <Section
        title="Top pages"
        desc="Most-viewed pages. Visitors counts each person once; views counts every visit."
      >
        {pages.length === 0 ? (
          <div className={styles.empty}>No page views recorded yet.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Path</th>
                <th className={styles.tableNum}>Visitors</th>
                <th className={styles.tableNum}>Views</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => {
                const flag = pageSuggestion(p, medianViews);
                return (
                  <tr key={p.path}>
                    <td>
                      <span className={styles.path}>{p.path}</span>
                      {flag ? (
                        <>
                          <br />
                          <span className={styles.flag}>{flag}</span>
                        </>
                      ) : null}
                    </td>
                    <td className={styles.tableNum}>{p.uniques.toLocaleString()}</td>
                    <td className={styles.tableNum}>{p.views.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>

      <Section
        title="Top search queries"
        desc="Search terms that led people here, from Search Console."
      >
        {queries.length === 0 ? (
          <div className={styles.empty}>
            No query data yet — set the Search Console site URL above, or check back once traffic
            builds up.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Query</th>
                <th className={styles.tableNum}>Clicks</th>
                <th className={styles.tableNum}>CTR</th>
              </tr>
            </thead>
            <tbody>
              {queries.map((q) => (
                <tr key={q.query}>
                  <td>{q.query}</td>
                  <td className={styles.tableNum}>{q.clicks.toLocaleString()}</td>
                  <td className={styles.tableNum}>{(q.ctr * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

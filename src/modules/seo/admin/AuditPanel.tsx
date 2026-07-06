import {
  metadataCoverage,
  duplicateMeta,
  noindexPages,
  redirectChains,
  top404s,
  webVitalsSummary,
} from "../audit/queries";
import { WEB_VITALS_METRICS } from "../audit/tracking";
import { Section } from "@/components/admin/Section";
import { Create404Redirect } from "./Create404Redirect";

const muted = { color: "var(--text-muted)", fontSize: "var(--text-sm)" } as const;
const mono = { fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" } as const;

/** Units + friendly names for the CWV summary. */
const VITALS_META: Record<string, { label: string; unit: string }> = {
  LCP: { label: "Largest Contentful Paint", unit: "ms" },
  CLS: { label: "Cumulative Layout Shift", unit: "" },
  INP: { label: "Interaction to Next Paint", unit: "ms" },
  FCP: { label: "First Contentful Paint", unit: "ms" },
  TTFB: { label: "Time to First Byte", unit: "ms" },
};

/**
 * The SEO Audit / Health report. A server component: runs the read-only audit
 * queries and renders coverage, duplicates, redirect chains, logged 404s (with
 * a one-click "create redirect"), and Core Web Vitals field data.
 */
export async function AuditPanel() {
  const [coverage, dupes, noindex, chains, notFounds, vitals] = await Promise.all([
    metadataCoverage(),
    duplicateMeta(),
    noindexPages(),
    redirectChains(),
    top404s(50),
    webVitalsSummary(),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <Section
        title="Metadata coverage"
        desc={`${coverage.complete} of ${coverage.total} indexable pages have a title, description, and share image.`}
      >
        {coverage.gaps.length === 0 ? (
          <p style={muted}>Every indexable page is fully described. ✓</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {coverage.gaps.map((g) => (
              <li key={g.route}>
                <span style={mono}>{g.route}</span>{" "}
                <span style={muted}>— missing {g.missing.join(", ")}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Duplicate metadata" desc="Pages sharing an identical title or description dilute relevance.">
        {dupes.titles.length === 0 && dupes.descriptions.length === 0 ? (
          <p style={muted}>No duplicate titles or descriptions. ✓</p>
        ) : (
          <>
            {dupes.titles.map((d) => (
              <p key={`t-${d.value}`} style={{ margin: "0 0 var(--space-2)" }}>
                <strong>Title</strong> “{d.value}” — <span style={mono}>{d.routes.join(", ")}</span>
              </p>
            ))}
            {dupes.descriptions.map((d) => (
              <p key={`d-${d.value}`} style={{ margin: "0 0 var(--space-2)" }}>
                <strong>Description</strong> — <span style={mono}>{d.routes.join(", ")}</span>
              </p>
            ))}
          </>
        )}
      </Section>

      <Section title="Redirect chains" desc="A redirect whose target is itself redirected — wastes crawl budget.">
        {chains.length === 0 ? (
          <p style={muted}>No redirect chains. ✓</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "var(--space-5)" }}>
            {chains.map((c) => (
              <li key={c.from} style={mono}>
                {c.from} → {c.via} → {c.to}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Broken links (404s)" desc="URLs visitors hit that don't exist. Create a redirect to reclaim the traffic.">
        {notFounds.length === 0 ? (
          <p style={muted}>No 404s logged yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
                <th style={{ padding: "var(--space-2) 0" }}>Path</th>
                <th>Hits</th>
                <th>Referrer</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {notFounds.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ ...mono, padding: "var(--space-2) 0" }}>{r.path}</td>
                  <td>{r.count}</td>
                  <td style={{ ...muted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.referrer || "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Create404Redirect fromPath={r.path} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Core Web Vitals (field data)" desc="p75 across real visits over the last 28 days — Google's ranking measure.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--space-4)" }}>
          {WEB_VITALS_METRICS.map((m) => {
            const v = vitals[m];
            const meta = VITALS_META[m];
            return (
              <div key={m} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-2)", padding: "var(--space-4)" }}>
                <div style={{ fontWeight: 600 }}>{m}</div>
                <div style={muted}>{meta.label}</div>
                <div style={{ fontSize: "var(--text-h3)", marginTop: "var(--space-2)" }}>
                  {v.p75 == null ? "—" : m === "CLS" ? v.p75.toFixed(3) : `${Math.round(v.p75)}${meta.unit}`}
                </div>
                <div style={muted}>{v.samples} samples</div>
              </div>
            );
          })}
        </div>
        {noindex.length > 0 ? (
          <p style={{ ...muted, marginTop: "var(--space-4)" }}>
            {noindex.length} published page{noindex.length === 1 ? "" : "s"} hidden from search (noindex).
          </p>
        ) : null}
      </Section>
    </div>
  );
}

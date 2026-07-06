import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/modules/auth/guards";
import { getGeneralSettings } from "@/modules/settings/queries";
import { getSeoSettings } from "@/modules/seo/queries";
import { getDomainSettings } from "@/modules/domain/queries";
import { SeoForm } from "@/modules/seo/admin/SeoForm";
import { CanonicalForm } from "@/modules/seo/admin/CanonicalForm";
import { AuditPanel } from "@/modules/seo/admin/AuditPanel";
import { BulkMappingScreen } from "@/modules/redirects/admin/BulkMappingScreen";
import { RedirectsManager } from "@/modules/redirects/admin/RedirectsManager";
import { MigrationBatches } from "@/modules/redirects/admin/MigrationBatches";
import { listRedirects, listRedirectBatches } from "@/modules/redirects/queries";
import { listImportJobs } from "@/modules/imports/queries";
import { AdminPage } from "@/components/admin/AdminPage";
import { getContentTypesSettings, isTypeDisabled } from "@/modules/custom-types/content-types-settings";
import { SEO_CONTENT_TYPES } from "@/modules/seo/validation";
import styles from "@/modules/seo/admin/hub.module.css";

export const metadata = { title: "SEO" };

const TABS = [
  { id: "settings", label: "Settings" },
  { id: "audit", label: "Audit & health" },
  { id: "canonical", label: "Canonical" },
  { id: "redirects", label: "Redirects" },
  { id: "redirects-bulk", label: "Bulk redirects" },
  { id: "insights", label: "Search insights" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function AdminSeoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <AdminSeoPageInner searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminSeoPageInner({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireUser("owner");
  const { tab: rawTab } = await searchParams;
  const tab: TabId = (TABS.some((t) => t.id === rawTab) ? rawTab : "settings") as TabId;

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
        SEO
      </h1>

      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/growth/seo?tab=${t.id}`}
            role="tab"
            aria-selected={tab === t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div style={{ marginTop: "var(--space-8)" }}>
        {tab === "settings" ? <SettingsTab /> : null}
        {tab === "audit" ? <AuditPanel /> : null}
        {tab === "canonical" ? <CanonicalTab /> : null}
        {tab === "redirects" ? <RedirectsTab /> : null}
        {tab === "redirects-bulk" ? <BulkRedirectsTab /> : null}
        {tab === "insights" ? <InsightsTab /> : null}
      </div>
    </AdminPage>
  );
}

async function SettingsTab() {
  const [seo, general, contentTypes] = await Promise.all([
    getSeoSettings(),
    getGeneralSettings(),
    getContentTypesSettings(),
  ]);
  const ogPreviewUrl = seo.defaultOgMediaId ?? "";
  const disabledTypes = Object.fromEntries(
    SEO_CONTENT_TYPES.map((type) => [type, isTypeDisabled(contentTypes, type)]),
  );
  return <SeoForm initial={seo} siteName={general.name} ogPreviewUrl={ogPreviewUrl} disabledTypes={disabledTypes} />;
}

async function CanonicalTab() {
  const domain = await getDomainSettings();
  return <CanonicalForm initial={domain} />;
}

/**
 * Redirect management: the manual add/edit table plus the migration surface
 * (import-job status + roll-back-able redirect batches). The bulk-import flow
 * itself lives in the sibling "Bulk redirects" tab.
 */
async function RedirectsTab() {
  const [redirects, batches, jobs] = await Promise.all([
    listRedirects(),
    listRedirectBatches(),
    listImportJobs(),
  ]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
      <RedirectsManager redirects={redirects} />
      <MigrationBatches batches={batches} jobs={jobs} />
    </div>
  );
}

/**
 * Bulk redirect mapping (migration). Loads nothing heavy — the screen is a
 * client component that drives its own dry-run → review → commit server
 * actions (propose/commit/rollback in the redirects module).
 */
function BulkRedirectsTab() {
  return <BulkMappingScreen />;
}

/**
 * Search insights points at the existing Analytics → Traffic screen, which
 * already surfaces Google Search Console query/click data via the ga4 adapter
 * (topQueries). We link rather than duplicate that UI.
 */
function InsightsTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", maxWidth: "40rem" }}>
      <p style={{ margin: 0, color: "var(--text-muted)" }}>
        Search-query performance (impressions, clicks, CTR, position) comes from Google Search Console.
      </p>
      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        <Link href="/admin/analytics/traffic" style={{ textDecoration: "underline" }}>
          View search traffic →
        </Link>
        <Link href="/admin/settings/ai" style={{ textDecoration: "underline" }}>
          AI &amp; crawlers (GEO) →
        </Link>
      </div>
    </div>
  );
}

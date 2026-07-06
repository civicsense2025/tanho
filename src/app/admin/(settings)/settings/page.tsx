import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/modules/auth/guards";
import styles from "@/components/admin/chrome.module.css";
import { AdminPage } from "@/components/admin/AdminPage";

const SETTINGS: Array<{ label: string; href: string; desc: string }> = [
  { label: "General", href: "/admin/settings/general", desc: "Site name, tagline, locale, indexing" },
  { label: "Brand", href: "/admin/settings/brand", desc: "Colors, type, spacing, logo" },
  { label: "Fonts", href: "/admin/settings/fonts", desc: "Google Fonts or your own uploaded font files" },
  { label: "Blocks", href: "/admin/settings/blocks", desc: "Block registry — enable/disable block types" },
  { label: "People", href: "/admin/settings/people", desc: "Sign-ups, profiles, subscriptions, privacy" },
  { label: "Membership", href: "/admin/settings/membership", desc: "Paid tiers and the billing portal" },
  { label: "Payments", href: "/admin/settings/payments", desc: "Stripe, currency, tax, payouts" },
  { label: "Policies", href: "/admin/settings/policies", desc: "Privacy, terms, cookies, store policies" },
  { label: "AI & crawlers", href: "/admin/settings/ai", desc: "Bot access, RSL, llms.txt, protection" },
  { label: "Data sources", href: "/admin/settings/data-sources", desc: "External database connections for live blocks" },
  { label: "API tokens", href: "/admin/settings/api-tokens", desc: "Bearer tokens for the Swift app and other external clients" },
  { label: "Marketplace", href: "/admin/settings/marketplace", desc: "Enable and configure your pack marketplace" },
];

export const metadata = { title: "Settings" };

export default function SettingsIndexPage() {
  return (
    <Suspense fallback={null}>
      <SettingsIndexPageInner />
    </Suspense>
  );
}

async function SettingsIndexPageInner() {
  await requireUser();
  return (
    <AdminPage>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--space-4)", marginTop: "var(--space-6)" }}>
        {SETTINGS.map((s) => (
          <Link key={s.href} href={s.href} className={styles.section} style={{ textDecoration: "none", display: "block" }}>
            <div style={{ fontSize: "var(--text-body)", fontWeight: "var(--weight-medium)" as never, color: "var(--text)", marginBottom: "4px" }}>
              {s.label}
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{s.desc}</div>
          </Link>
        ))}
      </div>
    </AdminPage>
  );
}

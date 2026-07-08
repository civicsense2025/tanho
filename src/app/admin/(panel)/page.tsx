import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/modules/auth/guards";
import { listPages } from "@/modules/pages/queries";
import { listEntries } from "@/modules/entries/queries";
import { listBookings } from "@/modules/scheduling/queries";
import { codePageSummaries } from "@/app/(public)/code-pages/registry";
import { DashboardTabs } from "@/modules/pages/admin/DashboardTabs";
import { getOnboardingState } from "@/modules/onboarding/queries";
import { onboardingChecklistItems } from "@/modules/onboarding/setup-checklist-items";
import { SetupChecklist } from "@/modules/commerce/admin/SetupChecklist";
import { contentToPurchaseCorrelations } from "@/modules/analytics/correlation";
import { CorrelationCard } from "@/modules/analytics/admin/CorrelationCard";
import { getEnabledCustomTypes } from "@/modules/custom-types/queries";
import { getEntitySchema } from "@/entities/registry-async";
import { toEntitySchemaSummary } from "@/entities/types";
import { getContentTypesSettings } from "@/modules/custom-types/content-types-settings";

function greeting(now: Date): string {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/**
 * Admin dashboard — the design's AdminDashboard: a masthead (eyebrow + greeting
 * + at-a-glance stat strip, with an UP NEXT booking card) over the content-type
 * tabs. Identity/settings live in the top-bar account menu, so this is purely
 * "what's happening across your site".
 */
export default function AdminDashboardPage() {
  return (
    <Suspense fallback={null}>
      <AdminDashboardPageInner />
    </Suspense>
  );
}

async function AdminDashboardPageInner() {
  const user = await requireUser();
  const first = user.name.split(" ")[0];

  const onboarding = await getOnboardingState();
  // First-ever visit only — never redirect again once anything's been
  // completed or the wizard's been dismissed/finished.
  if (onboarding.dismissedAt === null && onboarding.completedSteps.length === 0) {
    redirect("/admin/onboarding");
  }

  const [allPages, projects, guides, resources, upcoming, correlations, customTypes, settings] = await Promise.all([
    listPages(),
    listEntries("project"),
    listEntries("guide"),
    listEntries("resource"),
    listBookings("upcoming"),
    contentToPurchaseCorrelations(),
    getEnabledCustomTypes(),
    getContentTypesSettings(),
  ]);

  const pages = allPages.filter((p) => p.kind !== "post");
  const posts = allPages.filter((p) => p.kind === "post");
  const published = allPages.filter((p) => p.status === "published").length;
  const draft = allPages.filter((p) => p.status === "draft").length;

  const customTypeEntries = await Promise.all(
    customTypes
      .filter((t) => !t.tableName)
      .map(async (t) => {
        const entity = `custom:${t.slug}`;
        const [schema, items] = await Promise.all([getEntitySchema(entity), listEntries(entity)]);
        return {
          slug: t.slug,
          name: t.name,
          plural: t.pluralName || t.name,
          entity,
          items,
          schema: schema ? toEntitySchemaSummary(schema) : undefined,
          customFields: t.fields,
        };
      }),
  );

  const contentItems = allPages.length + projects.length + guides.length + resources.length + customTypeEntries.reduce((n, t) => n + t.items.length, 0);
  const nextBooking = upcoming[0];

  const counts = {
    pages: pages.length,
    posts: posts.length,
    projects: projects.length,
    guides: guides.length,
    resources: resources.length,
    custom: Object.fromEntries(customTypeEntries.map((t) => [t.slug, t.items.length])),
  };

  return (
    <main style={{ maxWidth: "var(--width-prose)", margin: "0 auto", padding: "var(--space-2) var(--gutter) var(--space-12)" }}>
      {/* Masthead */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "var(--space-6)",
          flexWrap: "wrap",
          paddingTop: "var(--space-6)",
          paddingBottom: "var(--space-8)",
          marginBottom: "var(--space-6)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-widest)", color: "var(--text-faint)", marginBottom: 8 }}>
            Dashboard
          </div>
          <h1 style={{ margin: 0, fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never, letterSpacing: "var(--tracking-tight)", color: "var(--text)" }}>
            {greeting(new Date())}, {first}.
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            Here&apos;s what&apos;s happening across your site.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", flexWrap: "wrap" }}>
          {nextBooking ? (
            <Link href="/admin/scheduling" style={{ textDecoration: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)", minWidth: 220 }}>
              <div style={{ fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)", marginBottom: 6 }}>
                Up next · scheduling →
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--text-sm)", color: "var(--text)" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)" }} />
                {nextBooking.date} · {nextBooking.time} {nextBooking.personName ? `— ${nextBooking.personName}` : ""}
              </div>
            </Link>
          ) : null}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)" }}>
            <Stat n={contentItems} label="Content items" />
            <Divider />
            <Stat n={published} label="Published" />
            <Divider />
            <Stat n={draft} label="In draft" />
          </div>
        </div>
      </div>

      {onboarding.dismissedAt === null ? (
        <Link href="/admin/onboarding" style={{ display: "block", marginBottom: "var(--space-6)", textDecoration: "none" }}>
          <SetupChecklist items={onboardingChecklistItems(onboarding)} />
        </Link>
      ) : null}

      <CorrelationCard rows={correlations} />

      <DashboardTabs
        pages={pages}
        posts={posts}
        projects={projects}
        guides={guides}
        resources={resources}
        customTypes={customTypeEntries}
        codePages={codePageSummaries()}
        counts={counts}
        disabledTypes={new Set(settings.disabled)}
      />
    </main>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div style={{ minWidth: 58 }}>
      <div style={{ fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)" as never, letterSpacing: "var(--tracking-tight)", color: "var(--text)", lineHeight: 1 }}>{n}</div>
      <div style={{ fontFamily: "var(--font-label)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-faint)", marginTop: 5 }}>{label}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />;
}

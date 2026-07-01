import { Button, TextLink } from "@/components/ui";
import type { ResolvedSettings } from "@/lib/settings";

/**
 * First-run onboarding guide. Shown on the admin dashboard when the instance looks unconfigured
 * (no site_settings rows written yet). It doesn't duplicate /admin/settings — it orients a fresh
 * self-hoster and links into the settings panel + docs for each step. Once the owner saves any
 * setting, `configured` becomes true and this disappears.
 *
 * Pure/presentational: the caller decides `configured` (e.g. from listSiteSettings().length) and
 * passes the resolved settings so the checklist can show which features are already on.
 */
export function SetupChecklist({ settings, configured }: { settings: ResolvedSettings; configured: boolean }) {
  if (configured) return null;

  const steps: { label: string; done: boolean; hint: string }[] = [
    {
      label: "Set your brand — name, description, author",
      done: false,
      hint: "Site identity in Settings; replaces the template defaults.",
    },
    {
      label: "Choose your database",
      done: true, // it's running, so a DB is connected
      hint: `Connected via DB_PROVIDER (${settings.mode} mode). Turso, Postgres, or MongoDB.`,
    },
    {
      label: "Turn on the features you want",
      done: settings.features.newsletter || settings.features.payments,
      hint: "Newsletter, payments, guides — toggle live in Settings; disabled features load no code.",
    },
    {
      label: "Add integration keys (email, Stripe) if using paid/newsletter",
      done: Boolean(settings.integrations.emailProvider),
      hint: "Encrypted at rest. Stripe emails + portal are configured in your Stripe Dashboard.",
    },
  ];

  return (
    <section
      style={{
        marginBottom: "var(--space-8)",
        padding: "var(--space-6)",
        border: "1px solid var(--accent)",
        borderRadius: "var(--radius-sm)",
        background: "var(--accent-tint)",
      }}
    >
      <h2 style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-h2)", fontWeight: 500, color: "var(--text)" }}>
        Welcome — let&apos;s set up your site
      </h2>
      <p style={{ margin: "0 0 var(--space-5)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        This is a fresh install running on the template defaults. A few steps to make it yours:
      </p>
      <ul style={{ listStyle: "none", margin: "0 0 var(--space-5)", padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {steps.map((s) => (
          <li key={s.label} style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
            <span aria-hidden style={{ color: s.done ? "var(--success)" : "var(--text-faint)", fontSize: "var(--text-sm)" }}>
              {s.done ? "✓" : "○"}
            </span>
            <span>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>{s.label}</span>
              <span style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{s.hint}</span>
            </span>
          </li>
        ))}
      </ul>
      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
        <Button as="a" href="/admin/settings" variant="accent" size="sm">
          Open Settings
        </Button>
        <TextLink href="/admin/updates" muted style={{ fontSize: "var(--text-xs)" }}>
          Template &amp; updates
        </TextLink>
      </div>
    </section>
  );
}

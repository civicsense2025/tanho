import { getSettings } from "@/lib/settings";
import { TextLink } from "@/components/ui";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Thank you", robots: { index: false, follow: false } };

/** Post-checkout confirmation. Entitlement is granted server-side by the webhook (the source of
 * truth) — this page is just a friendly landing. The session_id is informational; we never grant
 * access based on it (that would trust a client-visible value). */
export default async function CheckoutSuccessPage() {
  const siteConfig = await getSettings();
  if (!siteConfig.features.payments) notFound();
  return (
    <main style={{ maxWidth: "var(--width-prose)", margin: "0 auto", padding: "var(--space-12) var(--gutter)", textAlign: "center" }}>
      <h1 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-h1)", fontWeight: 500, color: "var(--text)" }}>Thank you</h1>
      <p style={{ margin: "0 0 var(--space-6)", fontSize: "var(--text-lg)", color: "var(--text-muted)" }}>
        Your payment went through. A receipt is on its way to your email, and any access you purchased will be
        available shortly.
      </p>
      <TextLink arrow="back" href="/">Back to {siteConfig.siteName}</TextLink>
    </main>
  );
}

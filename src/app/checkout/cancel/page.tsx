import { getSettings } from "@/lib/settings";
import { TextLink } from "@/components/ui";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Checkout canceled", robots: { index: false, follow: false } };

export default async function CheckoutCancelPage() {
  const siteConfig = await getSettings();
  if (!siteConfig.features.payments) notFound();
  return (
    <main style={{ maxWidth: "var(--width-prose)", margin: "0 auto", padding: "var(--space-12) var(--gutter)", textAlign: "center" }}>
      <h1 style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-h1)", fontWeight: 500, color: "var(--text)" }}>Checkout canceled</h1>
      <p style={{ margin: "0 0 var(--space-6)", fontSize: "var(--text-lg)", color: "var(--text-muted)" }}>
        No charge was made. You can try again whenever you like.
      </p>
      <TextLink arrow="back" href="/">Back to {siteConfig.siteName}</TextLink>
    </main>
  );
}

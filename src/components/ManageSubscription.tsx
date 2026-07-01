import { Button } from "@/components/ui";

/**
 * Link to Stripe's HOSTED customer portal login page. Stripe emails the reader their login link
 * and hosts the entire management UI (cancel, update card, invoices) — so the template owns no
 * portal auth, no magic-link handling, and no billing-email delivery. The owner enables the
 * Customer Portal in their Stripe Dashboard and pastes its login URL here.
 *
 * Reads a public env var (the portal login URL is not a secret). Renders nothing if unset.
 */
export function ManageSubscription({ label = "Manage subscription" }: { label?: string }) {
  const url = process.env.NEXT_PUBLIC_STRIPE_PORTAL_URL;
  if (!url) return null;
  return (
    <Button as="a" href={url} variant="outline" size="sm">
      {label}
    </Button>
  );
}

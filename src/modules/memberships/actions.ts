"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { payments } from "@/adapters/payments";
import { people } from "@/modules/people/schema";
import { getViewer } from "@/modules/people/viewer";
import { tierBySlug, readMembershipSettings } from "./tiers";

const APP_URL = process.env.APP_URL ?? "";

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error?: string; redirect?: string };

/**
 * Start a subscription Checkout for a tier. The person's identity —
 * clientReferenceId and metadata.personId — is taken from the SERVER session
 * viewer, never from the client, so a caller can only ever subscribe as
 * themselves. Prices come from the tier's stripePriceId (settings), never the
 * client. Refuses cleanly when payments aren't configured.
 */
export async function startMembershipCheckout(
  tierSlug: string,
): Promise<CheckoutResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, redirect: "/join" };

  const tier = await tierBySlug(tierSlug);
  if (!tier) return { ok: false, error: "That membership isn't available." };

  if (!payments.isConfigured()) {
    return { ok: false, error: "Memberships aren't available yet" };
  }
  if (!tier.stripePriceId) {
    return { ok: false, error: "This tier isn't ready for checkout yet." };
  }

  const person = await db.query.people.findFirst({
    where: eq(people.id, viewer.personId),
  });

  const session = await payments.createCheckoutSession({
    mode: "subscription",
    lineItems: [{ priceId: tier.stripePriceId, quantity: 1 }],
    successUrl: `${APP_URL}/account?welcome=1`,
    cancelUrl: `${APP_URL}/membership`,
    customerEmail: viewer.email,
    stripeCustomerId: person?.stripeCustomerId || undefined,
    clientReferenceId: viewer.personId,
    metadata: { personId: viewer.personId, tier: tierSlug },
  });

  return { ok: true, url: session.url };
}

export type PortalResult =
  | { ok: true; url: string }
  | { ok: false; error?: string; redirect?: string };

/**
 * Open the Stripe Billing Portal for the current viewer. Requires a signed-in
 * viewer with a Stripe customer id and portalEnabled in settings. The customer
 * id is read from the viewer's OWN person row — a caller can only manage their
 * own billing.
 */
export async function openBillingPortal(): Promise<PortalResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, redirect: "/join" };

  const settings = await readMembershipSettings();
  if (!settings.portalEnabled) {
    return { ok: false, error: "Self-serve billing isn't available." };
  }
  if (!payments.isConfigured()) {
    return { ok: false, error: "Memberships aren't available yet" };
  }

  const person = await db.query.people.findFirst({
    where: eq(people.id, viewer.personId),
  });
  if (!person?.stripeCustomerId) {
    return { ok: false, error: "No billing account found for you yet." };
  }

  const url = await payments.billingPortalUrl(
    person.stripeCustomerId,
    `${APP_URL}/account`,
  );
  return { ok: true, url };
}

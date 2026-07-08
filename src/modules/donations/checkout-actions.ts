"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { clientIp } from "@/lib/client-ip";
import { payments } from "@/adapters/payments";
import { getViewer } from "@/modules/people/viewer";
import { orderItems, orders } from "@/modules/commerce/schema";
import { generateOrderCode } from "@/modules/commerce/order-code";
import { readDonationsSettings } from "./donations-settings";
import { allowDonationCheckout } from "./rate-limit";

const requestSchema = z.object({ email: z.email().optional() });

export type StartDonationResult = { ok: true; url: string } | { ok: false; error: string };

function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Start a donation Checkout Session. The amount is NOT collected here — the
 * donation Price uses Stripe's custom_unit_amount ("pay what you want"), so
 * the visitor picks/enters the amount on the Stripe-hosted Checkout page,
 * validated there against the configured min/max. This order's totalCents
 * starts at 0 and is reconciled by the webhook once the amount is known.
 */
export async function startDonationCheckout(input: unknown): Promise<StartDonationResult> {
  const hdrs = await headers();
  const ip = clientIp(hdrs);
  if (!(await allowDonationCheckout(ip))) {
    return { ok: false, error: "Too many attempts. Please try again in a few minutes." };
  }

  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request" };

  const donationSettings = await readDonationsSettings();
  if (!donationSettings.enabled || !donationSettings.stripePriceId) {
    return { ok: false, error: "Donations aren't enabled yet." };
  }
  if (!payments.isConfigured()) {
    return { ok: false, error: "Donations aren't accepting payments yet." };
  }

  const viewer = await getViewer();
  const email = viewer?.email ?? parsed.data.email;
  if (!email) return { ok: false, error: "An email address is required." };

  const code = generateOrderCode();
  const [order] = await db
    .insert(orders)
    .values({
      code,
      personId: viewer?.personId ?? null,
      email,
      status: "pending",
      totalCents: 0,
      currency: donationSettings.currency,
      source: "donation",
    })
    .returning({ id: orders.id });

  await db.insert(orderItems).values({
    orderId: order.id,
    productId: null,
    variantId: null,
    name: "Donation",
    qty: 1,
    unitCents: 0,
  });

  const { url } = await payments.createCheckoutSession({
    mode: "payment",
    lineItems: [{ priceId: donationSettings.stripePriceId, quantity: 1 }],
    successUrl: `${appUrl()}/donate/success?code=${encodeURIComponent(code)}`,
    cancelUrl: `${appUrl()}/donate`,
    customerEmail: email,
    clientReferenceId: order.id,
    metadata: { kind: "donation" },
  });

  if (!url) return { ok: false, error: "Could not start checkout. Please try again." };
  return { ok: true, url };
}

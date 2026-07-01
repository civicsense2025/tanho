import type Stripe from "stripe";
import { getStripe, getWebhookSecret } from "./client";
import {
  getOrderByCheckoutSession,
  updateOrder,
  createOrder,
  getSubscriptionByStripeId,
  createSubscription,
  updateSubscription,
} from "@/lib/db";
import type { SubscriptionStatus } from "@/lib/db";

/**
 * Verifies and handles Stripe webhook events. Security-critical:
 *  - Verifies the signature against the RAW body via constructEvent (Node runtime). Any parse of
 *    the body before verification would break the signature.
 *  - Idempotent: Stripe retries for up to 3 days, so handlers must tolerate re-delivery. Orders
 *    are keyed by checkout-session id and subscriptions by Stripe subscription id, and every
 *    write is an upsert, so a duplicate event is a no-op.
 *  - Entitlement is granted ONLY from a verified checkout.session.completed / invoice.paid, using
 *    trusted metadata — never from client input.
 *
 * verifyEvent throws on an invalid signature; the route maps that to a 400.
 */
export function verifyEvent(rawBody: string, signature: string | null): Stripe.Event {
  if (!signature) throw new Error("Missing stripe-signature header");
  return getStripe().webhooks.constructEvent(rawBody, signature, getWebhookSecret());
}

/** Maps a Stripe subscription status string to our enum (unknown → "incomplete"). */
function mapSubStatus(s: string): SubscriptionStatus {
  const known: SubscriptionStatus[] = [
    "active", "trialing", "past_due", "canceled", "unpaid", "incomplete", "incomplete_expired",
  ];
  return (known as string[]).includes(s) ? (s as SubscriptionStatus) : "incomplete";
}

async function upsertSubscriptionFromStripe(sub: Stripe.Subscription): Promise<void> {
  const email = (sub as unknown as { customer_email?: string }).customer_email ?? null;
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
  const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
  const status = mapSubStatus(sub.status);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const existing = await getSubscriptionByStripeId(sub.id);
  if (existing) {
    await updateSubscription(existing.id, { status, currentPeriodEnd, priceId, customerEmail: email ?? existing.customerEmail });
  } else {
    await createSubscription({
      stripeSubscriptionId: sub.id,
      stripeCustomerId: customerId,
      customerEmail: email,
      status,
      currentPeriodEnd,
      priceId,
    });
  }
}

/** Handles one verified event. Returns quickly; each branch is idempotent. */
export async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const kind = (session.metadata?.kind as "one_time" | "subscription" | "donation") || "one_time";
      const email = session.customer_details?.email || session.customer_email || null;
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

      const existing = await getOrderByCheckoutSession(session.id);
      const patch = {
        status: "paid" as const,
        customerEmail: email,
        stripeCustomerId: customerId,
        stripePaymentIntentId: paymentIntentId,
        amountTotal: session.amount_total ?? null,
        currency: session.currency ?? null,
      };
      if (existing) {
        // Idempotent: a re-delivered event just re-confirms paid.
        if (existing.status !== "paid") await updateOrder(existing.id, patch);
      } else {
        // The checkout route usually pre-creates a pending order; create one if it's missing
        // (e.g. a Payment Link) so entitlement still works.
        await createOrder({
          stripeCheckoutSessionId: session.id,
          stripeCustomerId: customerId,
          stripePaymentIntentId: paymentIntentId,
          customerEmail: email,
          kind,
          status: "paid",
          postId: session.metadata?.postId ?? null,
          priceId: null,
          amountTotal: session.amount_total ?? null,
          currency: session.currency ?? null,
        });
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await upsertSubscriptionFromStripe(event.data.object as Stripe.Subscription);
      break;
    }

    case "invoice.paid": {
      // Subscription renewal — refresh the mirrored subscription's period/status.
      const invoice = event.data.object as unknown as { subscription?: string | { id: string } };
      const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      if (subId) {
        const sub = await getStripe().subscriptions.retrieve(subId);
        await upsertSubscriptionFromStripe(sub as Stripe.Subscription);
      }
      break;
    }

    default:
      // Unhandled event types are acknowledged (2xx) without action.
      break;
  }
}

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { memberships, people } from "@/modules/people/schema";
import { logActivity } from "@/modules/people/activity";
import { readMembershipSettings } from "./tiers";
import { stripeStatusToMembership } from "./status-map";

/**
 * Membership side of the Stripe state machine. Called from
 * commerce/stripe-events.ts AFTER signature verification + idempotency claim,
 * so this never re-verifies. It reconciles subscription/invoice events into
 * the `memberships` table.
 *
 * Security + robustness contract:
 *  - Persons are matched ONLY by provider-trusted keys: the Stripe customer id
 *    (== people.stripeCustomerId) or metadata.personId we ourselves set at
 *    checkout. Never trust anything else on the event to identify a person.
 *  - All reads/writes are parameterized Drizzle queries.
 *  - Every field is guarded; malformed or unmapped events are ignored, not
 *    thrown — a bad payload must never wedge the webhook.
 */
export async function handleMembershipEvent(
  type: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    switch (type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await onSubscriptionUpsert(data);
        break;
      case "customer.subscription.deleted":
        await onSubscriptionDeleted(data);
        break;
      case "invoice.paid":
        await onInvoicePaid(data);
        break;
      case "invoice.payment_failed":
        await onInvoicePaymentFailed(data);
        break;
      default:
        break; // not a membership event
    }
  } catch (err) {
    // Never throw back into the webhook — log and move on.
    console.error("[memberships] event handling failed", type, err);
  }
}

/** metadata is an optional string map on Stripe objects. */
function metaOf(data: Record<string, unknown>): Record<string, string> {
  const m = data.metadata;
  return m && typeof m === "object" ? (m as Record<string, string>) : {};
}

/** Unix seconds -> unix ms, or null when absent. */
function toMs(seconds: unknown): number | null {
  return typeof seconds === "number" ? seconds * 1000 : null;
}

/** The first line item's Stripe price id, if the shape is present. */
function firstPriceId(data: Record<string, unknown>): string | null {
  const items = data.items as { data?: Array<{ price?: { id?: string } }> } | undefined;
  const id = items?.data?.[0]?.price?.id;
  return typeof id === "string" ? id : null;
}

/** The first line item's unit amount in cents, if present. */
function firstPriceCents(data: Record<string, unknown>): number {
  const items = data.items as
    | { data?: Array<{ price?: { unit_amount?: number } }> }
    | undefined;
  const amount = items?.data?.[0]?.price?.unit_amount;
  return typeof amount === "number" ? amount : 0;
}

/** Resolve the person this subscription/invoice belongs to, or null. */
async function findPerson(data: Record<string, unknown>) {
  const meta = metaOf(data);
  if (meta.personId) {
    const byMeta = await db.query.people.findFirst({
      where: eq(people.id, meta.personId),
    });
    if (byMeta) return byMeta;
  }
  const customer = data.customer;
  if (typeof customer === "string" && customer) {
    return (
      (await db.query.people.findFirst({
        where: eq(people.stripeCustomerId, customer),
      })) ?? null
    );
  }
  return null;
}

/** Map a Stripe price id to one of our tier slugs, using the settings catalog. */
async function tierForData(data: Record<string, unknown>): Promise<string> {
  const meta = metaOf(data);
  if (meta.tier) return meta.tier;
  const priceId = firstPriceId(data);
  if (priceId) {
    const { tiers } = await readMembershipSettings();
    const match = tiers.find((t) => t.stripePriceId && t.stripePriceId === priceId);
    if (match) return match.slug;
  }
  return "member";
}

async function onSubscriptionUpsert(data: Record<string, unknown>) {
  const person = await findPerson(data);
  if (!person) return;

  const subscriptionId = typeof data.id === "string" ? data.id : null;
  if (!subscriptionId) return;

  const tier = await tierForData(data);
  const status = stripeStatusToMembership(String(data.status ?? ""));
  const priceCents = firstPriceCents(data);
  const currentPeriodEnd = toMs(data.current_period_end);
  const cancelAt = toMs(data.cancel_at);

  // If the person has no customer id yet, adopt the one on this event.
  if (!person.stripeCustomerId && typeof data.customer === "string") {
    await db
      .update(people)
      .set({ stripeCustomerId: data.customer })
      .where(eq(people.id, person.id));
  }

  const existing = await db.query.memberships.findFirst({
    where: eq(memberships.stripeSubscriptionId, subscriptionId),
  });

  if (existing) {
    await db
      .update(memberships)
      .set({ tier, status, priceCents, currentPeriodEnd, cancelAt })
      .where(eq(memberships.id, existing.id));
  } else {
    await db.insert(memberships).values({
      personId: person.id,
      tier,
      status,
      stripeSubscriptionId: subscriptionId,
      priceCents,
      currentPeriodEnd,
      cancelAt,
    });
  }

  await logActivity(person.id, "subscribe", `Membership ${status}: ${tier}`);
}

async function onSubscriptionDeleted(data: Record<string, unknown>) {
  const subscriptionId = typeof data.id === "string" ? data.id : null;
  if (!subscriptionId) return;
  await db
    .update(memberships)
    .set({ status: "canceled" })
    .where(eq(memberships.stripeSubscriptionId, subscriptionId));
}

/** Invoices reference their subscription; renewals flip a membership active. */
async function onInvoicePaid(data: Record<string, unknown>) {
  const subscriptionId = subscriptionIdOf(data);
  if (!subscriptionId) return;
  const periodEnd = invoicePeriodEnd(data);
  await db
    .update(memberships)
    .set(periodEnd ? { status: "active", currentPeriodEnd: periodEnd } : { status: "active" })
    .where(eq(memberships.stripeSubscriptionId, subscriptionId));
}

async function onInvoicePaymentFailed(data: Record<string, unknown>) {
  const subscriptionId = subscriptionIdOf(data);
  if (!subscriptionId) return;
  await db
    .update(memberships)
    .set({ status: "past_due" })
    .where(eq(memberships.stripeSubscriptionId, subscriptionId));
}

/** Invoice.subscription may be a string id or an expanded object. */
function subscriptionIdOf(data: Record<string, unknown>): string | null {
  const sub = data.subscription;
  if (typeof sub === "string" && sub) return sub;
  if (sub && typeof sub === "object" && typeof (sub as { id?: string }).id === "string") {
    return (sub as { id: string }).id;
  }
  return null;
}

/** The paid invoice's line-period end, if present, as unix ms. */
function invoicePeriodEnd(data: Record<string, unknown>): number | null {
  const lines = data.lines as
    | { data?: Array<{ period?: { end?: number } }> }
    | undefined;
  return toMs(lines?.data?.[0]?.period?.end);
}

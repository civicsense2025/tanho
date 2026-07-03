# Memberships

Paid membership tiers, billed through Stripe subscriptions, that unlock
gated content (the paywall reads a person's active tier).

## Tiers

Tiers live in the `membership` settings namespace — name, price (cents),
cadence (`mo`/`yr`), features, and a Stripe recurring **Price id**. Configure
them in **Admin → Settings → Membership**. Because the payments adapter
doesn't create recurring prices, you paste a Price id from your Stripe
dashboard into each tier (documented in the admin help text).

## How billing flows

1. A signed-in reader clicks *Join* on `/membership` →
   `startMembershipCheckout` creates a subscription-mode Stripe Checkout
   Session (customer + tier come from the **session**, never the client).
2. Stripe fires `customer.subscription.created` → the webhook's
   `handleMembershipEvent` upserts a `memberships` row (active) mapped to the
   person by `stripeCustomerId`/metadata.
3. `invoice.paid` keeps it active and bumps the period; `payment_failed`
   flips it to `past_due`; cancellation flips it to `canceled`.
4. The paywall gate (`getViewer` → `memberActive`, `tier`) reads that row —
   so a lapsed member loses access automatically.

Members manage or cancel through the Stripe Billing Portal
(`openBillingPortal`). Owners can grant comp memberships from the People CRM
without Stripe.

## Without Stripe

`/membership` still renders the tiers with a muted "Memberships open soon"
state; joining is disabled until keys are configured.

## Fit it to your cause

- **Free + paid split**: a single paid tier plus the free reader account is
  the common newsletter model — gate premium posts with a paywall block.
- **Annual-only / lifetime**: set cadence `yr`, or use a one-time product
  (commerce) for lifetime access and grant a comp membership on purchase.

## FAQ

**Why paste a Stripe Price id instead of auto-creating it?** Recurring
prices carry billing-interval semantics the generic product-sync doesn't
model; pasting the id keeps the adapter simple and gives you full control in
Stripe. Auto-creation is a possible later enhancement.

**Can a member see another member's status?** No — membership queries are
person-scoped and the account view only ever resolves the current viewer.

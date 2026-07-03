# Orders

An order is created the moment checkout starts (status `pending`) and moves
through its lifecycle driven **entirely by Stripe webhooks** — never by
client requests.

## Lifecycle

```
pending ──(checkout.session.completed)──▶ paid/unfulfilled
   │                                            │
   │                                     (fulfill + tracking)
   │                                            ▼
   │                                        fulfilled
   ├──(charge.refunded)──▶ refunded
   └──(charge.dispute.created)──▶ disputed
```

- **pending** — order + items created with DB-authoritative prices; waiting
  for payment.
- **paid → unfulfilled** — the webhook confirms payment, decrements
  inventory transactionally, and links/creates the customer in People.
- **fulfilled** — an admin (editor+) adds tracking and marks it shipped.
- **refunded** — an owner refunds through the admin, which calls Stripe; the
  webhook confirms the state.
- **disputed** — a chargeback; the order shows the evidence-due date and a
  link to respond in Stripe.

## Data

Each order stores a `code` (unguessable, for the customer-facing lookup),
customer email + optional linked person, `order_items` (name + unit price
snapshotted at purchase), totals in cents, Stripe ids, and shipping address.
Disputes get their own row.

## Trust model

- **One writer**: all paid/refunded/disputed transitions and inventory
  changes happen only in `src/modules/commerce/stripe-events.ts`.
- **Idempotent**: every webhook event id is claimed in a `stripe_events`
  ledger; duplicate deliveries are acked and skipped, so Stripe retries are
  safe.
- **Signature-verified**: the webhook route rejects unsigned/invalid
  payloads.
- The customer success page (`/shop/success?code=…`) reveals only status,
  items, and total — never email, address, or payment ids.

## Fit it to your cause

- **Manual fulfillment workflow**: the order detail's status buttons are the
  whole flow; add states by extending the `orders.status` enum and the state
  machine.
- **No shipping** (digital goods): skip shipping zones; the order total is
  just line items.

## FAQ

**An order is stuck in `pending`.** Payment never completed, or the webhook
didn't reach the app. Check `stripe listen` is forwarding and
`STRIPE_WEBHOOK_SECRET` matches.

**Can I mark an order paid manually?** No — that transition belongs to the
webhook so state can't diverge from Stripe. Fulfillment and refunds are the
admin-driven actions.

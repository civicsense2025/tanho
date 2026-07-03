# Connect Stripe

Commerce, memberships, and paid bookings run on Stripe. Without keys, those
modules stay locked (the admin shows a connect prompt); with keys, they work
end to end.

## 1. Keys

Add to `.env` (test keys while developing):

```
STRIPE_SECRET_KEY="sk_test_…"
STRIPE_WEBHOOK_SECRET="whsec_…"        # from step 3
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_…"
```

`payments.isConfigured()` flips to true as soon as `STRIPE_SECRET_KEY` is
present.

## 2. Enable the store

In **Admin → Shop**, click *Enable store*, then set currency, statement
descriptor, tax, and payout schedule under **Admin → Settings → Payments**.
Publishing a product syncs a durable Stripe product + price automatically.

## 3. Webhooks

The endpoint is `POST /api/webhooks/stripe`. For local development:

```
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

`stripe listen` prints a `whsec_…` — put it in `STRIPE_WEBHOOK_SECRET`. In
production, add the endpoint in the Stripe Dashboard and subscribe to:

- `checkout.session.completed` — marks the order paid/unfulfilled and
  decrements inventory
- `charge.refunded` — marks the order refunded
- `charge.dispute.created` / `.updated` / `.closed` — records the dispute and
  flags the order
- (memberships, Phase 8) `customer.subscription.*`, `invoice.*`

## How it stays correct

- **Signature-verified**: the route rejects any unsigned/invalid payload
  with 400.
- **Idempotent**: every event id is claimed in a `stripe_events` ledger;
  duplicate deliveries are acked and skipped. Retries are safe.
- **Single writer**: order paid/refunded/disputed transitions and inventory
  decrements happen only in `src/modules/commerce/stripe-events.ts`, inside a
  transaction — never from client-facing code.
- **Server-authoritative prices**: checkout recomputes every amount from the
  database; a tampered client price is ignored.

## Testing the flow

- Purchase: use test card `4242 4242 4242 4242`.
- Dispute: use `4000 0000 0000 0259` — it settles then disputes, producing a
  `disputed` order with an evidence-due date.
- Refund: from the order detail in admin (owner only), which calls the
  adapter and lets the webhook confirm the state.

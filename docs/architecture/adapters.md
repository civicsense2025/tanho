# Adapters

Anything that talks to the outside world sits behind a thin interface in
`src/adapters/`, so a self-hoster can swap the implementation without
touching feature code. This is the stack-swap story.

| Surface | Interface | Default impl | Swap for |
| --- | --- | --- | --- |
| Database | Drizzle + `lib/db/client.ts` | libSQL (Turso/file) | Postgres, MySQL, SQLite |
| Storage | `StorageAdapter` | local disk | S3, R2, GCS |
| Email | `EmailAdapter` | console (logs) | SMTP, Resend, SES |
| Payments | `PaymentsAdapter` | Stripe / null | any PSP |
| Analytics read | (Phase 9) | internal | GA4 |

Each interface lives in `src/adapters/types.ts`; each implementation is one
file under `src/adapters/<surface>/`, chosen by an `index.ts` that reads an
env var. A missing integration degrades gracefully — the null payments
adapter, for example, keeps commerce code importable and shows a "connect"
state instead of crashing.

## The database is an adapter too

All queries live in `src/modules/*/queries.ts` and go through Drizzle's
query builder — never raw SQL. Swapping databases means changing the driver
in `lib/db/client.ts` and regenerating migrations; the queries survive
because Drizzle speaks the same API across dialects. See
[../recipes/swap-database-to-postgres.md](../recipes/swap-database-to-postgres.md).

## Payments in detail

`PaymentsAdapter` (`src/adapters/payments/`) has two impls:

- **stripe** — used when `STRIPE_SECRET_KEY` is set. Creates Checkout
  Sessions, verifies webhooks, issues refunds, syncs durable products/prices,
  and opens the billing portal.
- **null** — used otherwise. Every payment method throws a clear "not
  configured" error, and `isConfigured()` returns false so the UI shows a
  connect prompt rather than a broken checkout.

Amounts are always integer cents. Prices come from the database or the
provider, never the client. The webhook is the single writer of paid /
refunded / disputed order state (see [../recipes/connect-stripe.md](../recipes/connect-stripe.md)).

## Analytics reads

`AnalyticsReadAdapter` (`src/adapters/analytics/`) is the read source behind the
admin analytics screens: `isConfigured()`, `overview()`, `topPages()`,
`topQueries()`.

- **internal** (default, always active) — reads the first-party
  `analytics_events` table via `modules/analytics/queries.ts`. Always
  "configured": there is nothing to connect.
- **ga4** (later) — would read Google Analytics 4 / Search Console behind OAuth,
  registered in `src/adapters/analytics/index.ts` behind an env flag.

The admin's Google connect gates are a **separate**, settings-driven concern
(`settings.analytics` flags flipped by owner-only stub actions). They gate the
UI, not the data source; wiring real Google means adding the `ga4` impl here and
running the OAuth handshake in `modules/analytics/connect-actions.ts`. See
[../entities/analytics.md](../entities/analytics.md).

## FAQ

**How do I add an S3 storage adapter?** Implement the four `StorageAdapter`
methods against your SDK, register it in `src/adapters/storage/index.ts`
behind a `STORAGE_DRIVER` check. Nothing else changes — media serving reads
`publicUrl()`.

**Can I use PayPal instead of Stripe?** Implement `PaymentsAdapter` for it.
The webhook state machine consumes a normalized `ProviderEvent`, so most of
the work is mapping the provider's events to it.

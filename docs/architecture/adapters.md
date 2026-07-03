# Adapters

Anything that talks to the outside world sits behind a thin interface in
`src/adapters/`, so a self-hoster can swap the implementation without
touching feature code. This is the stack-swap story.

| Surface | Interface | Default impl | Swap for |
| --- | --- | --- | --- |
| Database (primary) | Drizzle + `lib/db/client.ts` | libSQL (Turso/file) | Postgres, MySQL, SQLite |
| External data sources | `DataSourceAdapter` | none (per-connection, admin-configured) | Postgres, Supabase (Turso/MongoDB later) |
| Storage | `StorageAdapter` | local disk | S3, R2, GCS |
| Email | `EmailAdapter` | console (logs) | SMTP, Resend, SES |
| Payments | `PaymentsAdapter` | Stripe / null | any PSP |
| Analytics read | (Phase 9) | internal | GA4 |

Each interface lives in `src/adapters/types.ts`; each implementation is one
file under `src/adapters/<surface>/`, chosen by an `index.ts` that reads an
env var. A missing integration degrades gracefully — the null payments
adapter, for example, keeps commerce code importable and shows a "connect"
state instead of crashing.

## The primary database is an adapter too

All queries live in `src/modules/*/queries.ts` and go through Drizzle's
query builder — never raw SQL. Swapping the PRIMARY database means changing
the driver in `lib/db/client.ts` and regenerating migrations; the queries
survive because Drizzle speaks the same API across dialects. See
[../recipes/swap-database-to-postgres.md](../recipes/swap-database-to-postgres.md).

This is deliberately a different story from external data sources (below):
the primary DB is first-party/trusted schema the platform owns and controls
(so Drizzle's full relational query power — joins, transactions — is safe
to expose), while external connections hold third-party credentials and
must be queried through a narrow, allowlisted surface instead.

## External data sources (`DataSourceAdapter`)

Lets bound blocks read live rows from a self-hoster's OWN external database
(Postgres, Supabase — Turso/MongoDB planned) without the platform
hardcoding any vendor, and without giving blocks arbitrary SQL/query access.
Admin-configured in Settings → Data sources
(`src/modules/data-sources/`); each connection stores an owner-defined
table/column allowlist that is re-checked on every query regardless of what
a block's saved content claims — that allowlist, not the block content, is
the actual security boundary.

`DataSourceAdapter` (`src/adapters/types.ts`) has one method that matters
most: `query(spec: QuerySpec)`, where `QuerySpec` is a strictly-typed,
allowlisted descriptor (table/columns/filters/sort/limit) — never a raw
query string. Every implementation (`src/adapters/data-source/postgres.ts`,
`supabase.ts`) translates `QuerySpec` into a parameterized statement on its
native driver; there is no code path from admin UI or block content to a
concatenated query. Reads only in phase 1 — `capabilities().write` is
always `false`; no `mutate()` exists yet.

Unlike the other adapters, this one is NOT a single env-driven singleton:
`getDataSourceAdapter(connection)` (`src/adapters/data-source/index.ts`) is
a per-connection factory, since a self-hoster may configure many database
connections across providers simultaneously.

Connection CRUD (`src/modules/data-sources/connection-actions.ts`) is
owner-only, audited, and DB-backed rate-limited
(`src/modules/data-sources/rate-limit.ts`, mirroring
`modules/auth/rate-limit.ts`'s sliding window — never the in-memory
analytics pattern, since these credentials are security-sensitive). Binding
a block to an already-allowlisted table/columns is available to any editor.

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

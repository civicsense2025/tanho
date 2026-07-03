# Integrations (BYO credentials)

Every external integration on this platform is **bring-your-own-credentials**.
Nothing routes through the platform authors' accounts. Each deployment connects
its *own* Google, Stripe, and AI provider accounts, and a fresh clone with **no**
credentials still boots and runs — every integration degrades to a clearly
signalled, unconfigured state.

## The two credential shapes

| Shape | Where it lives | Used by |
| --- | --- | --- |
| **Static secrets** (API keys, OAuth client id/secret) | environment variables | Stripe, the Google OAuth *app* identity, optional AI key fallback |
| **Runtime-obtained tokens** (OAuth refresh tokens, admin-pasted API keys) | `integration_connections` table, **AES-256-GCM encrypted at rest** | Google Calendar/GA4/Search Console, the BYO AI key |

Static secrets are things the operator sets once at deploy time. Runtime tokens
are obtained *by clicking Connect* (OAuth) or *pasting a key* in the admin — they
can't be env vars because they don't exist until a human authorizes them. Those
are sealed with [`lib/crypto/secretbox.ts`](../../src/lib/crypto/secretbox.ts)
(HKDF-derived key from `APP_ENCRYPTION_KEY`, per-message random IV, auth-tagged)
and never sent to the browser.

## The `integration_connections` table

One row per connected external account
([`src/modules/integrations/schema.ts`](../../src/modules/integrations/schema.ts)):

| Column | Notes |
| --- | --- |
| `provider` | PK: `google-calendar` \| `google-analytics` \| `google-search-console` \| `ai` |
| `status` | `connected` \| `error` \| `revoked` |
| `credentials` | **sealed** JSON blob (secretbox token) — OAuth refresh token or API key |
| `accountLabel` | non-secret display label (email, property id) |
| `scopes` | granted OAuth scopes, for display / re-consent |
| `expiresAt` | access-token expiry (ms); refresh happens before it |
| `connectedAt` / `updatedAt` | timestamps |

Only `getCredentials()` decrypts — server-side, transiently. `connectionSummary()`
returns the non-secret fields so the admin can render a connected state without
ever touching plaintext.

## Google (Calendar, Analytics, Search Console)

One per-deployment OAuth **app** covers all three surfaces; each surface connects
independently with its own scopes.

**Operator setup (once):**

1. In [Google Cloud Console](https://console.cloud.google.com/) create an OAuth
   2.0 **Web application** credential.
2. Add the authorized redirect URI: `${APP_URL}/api/oauth/google/callback`.
3. Enable the APIs you want: Google Calendar API, Google Analytics Data API,
   Search Console API.
4. Set `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` in the
   deployment env.

**Then** an owner clicks **Connect** in the admin (Scheduling → Availability for
Calendar; Analytics → Overview / Traffic for GA4 / Search Console). The OAuth
flow (`access_type=offline`, `prompt=consent`) returns a **refresh token** that's
sealed into `integration_connections`. The connected account is the *operator's
own* Google account — the platform authors are never in the loop.

**Gating:**

- No `GOOGLE_OAUTH_CLIENT_ID/SECRET` → Connect buttons show a "set env first"
  hint; nothing breaks.
- Configured but not connected → Analytics serves first-party internal data;
  Scheduling uses the client-side "Add to Google Calendar" template link.
- Connected → real GA4 / Search Console reporting and two-way Calendar sync
  (event push + busy-time blocking in availability).

## Stripe (commerce, memberships, paid bookings, form payments)

Stripe uses **API keys, not OAuth** — the operator supplies their own account's
keys via env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Modes are isolated (test vs live), and only
the publishable key is ever client-side. Everything that charges money — checkout,
subscriptions, paid bookings, paid form fields — reuses the one
[`PaymentsAdapter`](../../src/adapters/payments/index.ts). With no key it swaps to
the null adapter: commerce shows a connect state, paid event types degrade to free
confirmation, paid form fields render a disabled note, and the site still works.

## AI (Anthropic / OpenAI / custom)

The AI provider is BYO too. An owner picks a provider (Settings → AI & crawlers →
Providers) and pastes an API key, which is sealed into `integration_connections`
under `ai`. A deployment-wide `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` env var is an
optional fallback; a key saved in the admin always wins. `builtin` / no key →
authoring features (alt text, SEO suggestions, post summaries) render disabled and
make no network calls.

## Fit it to your cause

- **Never want Google?** Leave `GOOGLE_OAUTH_CLIENT_ID` unset — analytics stay
  first-party and scheduling stays template-link based, forever. Nothing nags.
- **Different OAuth scopes?** Edit the per-surface scope lists in
  [`src/adapters/google/config.ts`](../../src/adapters/google/config.ts).
- **A different secrets store** (Vault, AWS Secrets Manager)? `secretbox` is the
  single seal/open boundary — swap its key source, or replace the
  `integration_connections` read/write in
  [`queries.ts`](../../src/modules/integrations/queries.ts), and every integration
  follows.
- **Self-hosted AI** (Ollama, vLLM, an OpenAI-compatible gateway)? Choose the
  "custom" provider and set its base URL — no code change.

## FAQ

**Do I need the platform authors' Google / Stripe / AI accounts?** No. Every
integration is your own account. The platform authors' credentials are never
used, and there is no shared/vendor OAuth app.

**Where are my OAuth tokens and API keys stored?** Encrypted (AES-256-GCM) in the
`integration_connections` table of *your* database, keyed by *your*
`APP_ENCRYPTION_KEY`. They're decrypted only server-side, only when making a call,
and never sent to the browser.

**What happens on a fresh clone with no keys?** It boots. Commerce is locked,
analytics is first-party, scheduling uses calendar template links, AI authoring is
disabled, paid fields are disabled — each with an honest "connect / configure"
state. You wire up exactly the integrations you want.

**Is `APP_ENCRYPTION_KEY` really required?** In production, yes — the app refuses
to seal credentials under the insecure dev fallback. Generate one with
`openssl rand -hex 32`.

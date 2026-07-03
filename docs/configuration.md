# Configuration

## Environment variables

All variables live in `.env` (see `.env.example`). Only `DATABASE_URL` has a
usable default; everything else is optional until you enable the feature
that needs it.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes (defaults to `file:./data/dev.db`) | libSQL/Turso connection string |
| `TURSO_AUTH_TOKEN` | remote DBs only | Turso auth token |
| `APP_URL` | production | Canonical origin for absolute URLs, JSON-LD, emails |
| `APP_ENCRYPTION_KEY` | when storing integration credentials | 32-byte hex key for AES-GCM encryption at rest (`openssl rand -hex 32`) |
| `STRIPE_SECRET_KEY` | commerce/memberships | Stripe secret key (test or live) |
| `STRIPE_WEBHOOK_SECRET` | commerce/memberships | Webhook signing secret (`stripe listen` prints one) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | commerce/memberships | Client-side Stripe key |
| `GOOGLE_OAUTH_CLIENT_ID` | Google Calendar / GA4 / Search Console | Your own Google Cloud OAuth app client id (BYO) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google Calendar / GA4 / Search Console | Matching OAuth client secret; redirect URI is `${APP_URL}/api/oauth/google/callback` |
| `ANTHROPIC_API_KEY` | AI authoring (optional fallback) | Deployment-wide Anthropic key; an admin-saved key wins over it |
| `OPENAI_API_KEY` | AI authoring (optional fallback) | Deployment-wide OpenAI key; an admin-saved key wins over it |
| `SMTP_URL` | production email | SMTP connection URL; unset = console adapter |
| `EMAIL_FROM` | production email | From address for transactional mail |

All integration credentials are **bring-your-own** — no variable points at the
platform authors' accounts. Runtime OAuth tokens and admin-pasted API keys are
AES-GCM encrypted in the `integration_connections` table (keyed by
`APP_ENCRYPTION_KEY`), never in env or the client. See
[entities/integrations.md](entities/integrations.md).

## Settings namespaces

Runtime configuration lives in the `settings` table, one JSON document per
namespace, all editable from the admin panel. Documented per module as each
lands: `general`, `seo`, `header`, `footer`, `announcement`, `payments`,
`people`, `scheduling`, `membership`, `content_types`, `ai_crawlers`,
`shipping`, `domain`, `mode`, `social`.

The white-label rule: **anything a human reads on the site comes from
settings or content — never from code.**

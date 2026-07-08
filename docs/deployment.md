# Deployment

## Turso + Vercel (managed, cheap)

1. Create a Turso database: `turso db create <name>`, then
   `turso db show <name> --url` and `turso db tokens create <name>`.
2. Set `DATABASE_URL` (libsql://…) and `TURSO_AUTH_TOKEN` in Vercel project
   env vars, along with `APP_URL`, `APP_ENCRYPTION_KEY`, and any Stripe/SMTP
   keys you use.
3. Run migrations against production once per release:
   `DATABASE_URL=libsql://… TURSO_AUTH_TOKEN=… npm run db:migrate`.
4. Deploy. Uploads on Vercel need a non-local StorageAdapter (S3-compatible)
   — see [architecture/adapters.md](architecture/adapters.md).

## Fully self-hosted (one VPS)

The platform runs anywhere Node 22 runs:

```bash
npm ci && npm run build
DATABASE_URL=file:/var/lib/lamina/site.db npm run db:migrate
DATABASE_URL=file:/var/lib/lamina/site.db node_modules/.bin/next start -p 3000
```

Put a reverse proxy (Caddy/nginx) in front for TLS. Local-disk uploads work
as-is; back up the database file and the uploads directory together.

Once your domain's DNS points here, use Settings → Domain in the admin panel
to check the record and see its status. That screen only checks DNS — it
doesn't provision certificates or configure the proxy; TLS is still your
reverse proxy's job (see the hardening checklist below).

## Stripe webhooks

Point a webhook endpoint at `https://<your-domain>/api/webhooks/stripe` with
the events listed in [recipes/connect-stripe.md](recipes/connect-stripe.md),
and set `STRIPE_WEBHOOK_SECRET` to its signing secret.

## Production hardening checklist

Before a public launch:

- **`APP_ENCRYPTION_KEY` is mandatory.** Integration credentials and signed
  opt-in/manage tokens derive from it. Generate one with `openssl rand -hex
  32`. In development a fallback is used with a console warning; **do not**
  ship without a real key.
- **Serve over HTTPS.** Session and reader cookies are `Secure` in
  production (`NODE_ENV=production`), so they won't be sent over plain HTTP —
  auth silently fails without TLS. Terminate TLS at your proxy or platform.
- **Change the seeded owner password** on first login (the neutral seed
  prints a generated one).
- **Set `APP_URL`** to your canonical origin — it's used for absolute URLs
  in emails, JSON-LD, Stripe redirect URLs, and the sitemap.
- **Real email**: set `SMTP_URL` + `EMAIL_FROM`, or the console adapter just
  logs verification/opt-in mail (fine for dev, useless in prod).
- **Uploads on serverless** (Vercel): implement an S3-compatible
  `StorageAdapter` — local disk doesn't persist. See
  [architecture/adapters.md](architecture/adapters.md).
- **Back up** the database and the uploads directory together; they're your
  whole site.
- **Review the security headers** for your platform (CSP, `X-Frame-Options`
  on `/admin`, referrer-policy) — add them at the proxy or in `proxy.ts`.

## BYO integrations (bring your own credentials)

Every external integration is **fully wired** and **bring-your-own-credentials**
— nothing routes through the platform authors' accounts, and a fresh clone with
no credentials still boots. Connect exactly the ones you want. Full reference:
[entities/integrations.md](entities/integrations.md).

- **Google Calendar sync + GA4 + Search Console** — real OAuth 2.0. Register
  your own Google Cloud OAuth app, set `GOOGLE_OAUTH_CLIENT_ID` /
  `GOOGLE_OAUTH_CLIENT_SECRET`, then click Connect in the admin. Refresh tokens
  are AES-GCM encrypted at rest. Unconfigured → first-party analytics + calendar
  template links (no nag).
- **AI authoring** (alt text, SEO suggestions, post summaries) — real calls to
  your chosen provider (Anthropic / OpenAI / any OpenAI-compatible endpoint).
  Paste a key in Settings → AI & crawlers, or set `ANTHROPIC_API_KEY` /
  `OPENAI_API_KEY` as a fallback. Unconfigured → authoring buttons disabled.
- **Form file / signature / payment fields** — files upload to your
  `StorageAdapter` (local disk by default; S3-compatible in prod), signatures
  capture on a canvas and upload as PNG, and payment fields charge through your
  Stripe account. Unconfigured payments → the field is a disabled note and the
  form still submits.
- **Paid bookings** — charge through your Stripe account via Checkout; the
  webhook confirms the booking and refunds on cancel per policy. No Stripe key →
  priced events degrade to free confirmation (free bookings always work).

Each integration is isolated behind an adapter and gated on `isConfigured()` /
connection state — see the relevant `docs/entities/*.md` and the FAQ.

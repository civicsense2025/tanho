# OYS Platform

A self-hostable, **white-label** website platform for creators and small
businesses: portfolio + guides + newsletter with memberships + shop + booking,
managed from a block-based page builder and a full admin panel. You own the
code, the content, the data, and the payment relationship.

Nothing brand-specific is hardcoded — every name, logo, color, menu, and page
lives in your database. Fit it to your cause: rename "Guides" to Recipes,
point the shop at donations, or strip it down to a one-page portfolio.

## Features

- **Page builder** — ~40 block types across content, layout, media, data,
  commerce, interactive, newsletter, and dynamic categories; stacked and
  canvas editing, drag reorder, multi-select, four block pickers.
- **Content types** — pages, posts, projects, guides, resources, products,
  collections, plus a custom content-type builder (16 field kinds, nested
  repeaters, references).
- **Design system admin** — edit 4 base colors + type + spacing scales; a
  full light/dark token set is derived live with WCAG contrast checks.
- **People CRM** — members, subscribers, leads; activity timelines, segments,
  lists, double opt-in.
- **Memberships & paywall** — Stripe subscriptions with server-enforced
  content gating (gated content never leaves the server).
- **Commerce** — products with variants and inventory, collections, shipping
  zones, orders with fulfillment/refund/dispute workflows.
- **Scheduling** — Calendly-style event types, availability rules, reminders,
  paid bookings, Google Calendar sync.
- **Forms** — Typeform-class builder (23 field kinds, quizzes, signups) that
  feeds the CRM.
- **SEO & analytics** — metadata templates, JSON-LD, sitemap/robots, AI
  crawler controls (citation vs training bots, llms.txt), built-in event
  analytics with GA4/Search Console connections.

## Quickstart

```bash
npm install
cp .env.example .env        # defaults run fully locally
npm run db:migrate
npm run seed                # neutral starter content
npm run dev
```

Then open http://localhost:3000 (site) and http://localhost:3000/admin.

**Dev login:** `npm run seed` creates the owner account from
`SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` in your `.env` — set both once so
you get the same login every time, instead of a fresh random password
printed to the console on every reseed. Wiping and reseeding the local DB in
one shot: `npm run seed:reset`.

Want to explore with a full example site? Load an industry sample —
`npm run seed:sample -- tech` (or `artist`, `services`, `nonprofit`). Each is a
fictional, brand-neutral demo that populates every feature with a consistent,
click-through nav; gated features (ecommerce, AI) show a "disabled until
enabled" state. See [docs/getting-started.md](docs/getting-started.md).

## Get Started (deploy your own)

Self-hosting is a standard Node process with a writable filesystem (no
Dockerfile or serverless config required). Set a few environment secrets
**before the first boot**, run the migrations, then finish setup in the
browser — a WordPress-style first-run install.

**1. Set environment secrets.** Copy `.env.example` to `.env` and set at least:

```bash
# The database the site runs on. Local file default shown; for production use
# a managed libSQL/Turso URL (libsql://<db>-<org>.turso.io) or a Postgres URL
# after running the database-swap recipe (docs/recipes).
DATABASE_URL="file:./data/dev.db"

# Canonical origin of the deployed site (absolute URLs, JSON-LD, emails, OAuth).
APP_URL="https://your-site.example.com"

# 32-byte hex key that encrypts stored integration credentials. Generate once:
#   openssl rand -hex 32
APP_ENCRYPTION_KEY="<paste the openssl output here>"
```

`DATABASE_URL` and `APP_ENCRYPTION_KEY` are read **once at boot** — they can't
be changed from inside the running site, so set them before you start. See
`.env.example` for the full list (Stripe, email, Google/Supabase OAuth are all
optional and stay dormant until configured).

**2. Install and migrate.**

```bash
npm install
npm run db:migrate      # creates the schema in your DATABASE_URL
npm run build && npm start
```

Do **not** run `npm run seed` on a real deployment — seeding creates a CLI
owner and starter content. Instead, create your owner from the browser (next
step).

**3. First-run install (in the browser).** On first launch, before any admin
exists, the site is **locked to visitors** — every public URL redirects to a
"coming soon / setup in progress" page. Open **`/admin/install`** to create the
owner account (name, email, password). That one-time form:

- creates the first `owner` and logs you in,
- unlocks the site for visitors,
- and drops you into the guided setup wizard (name your site → pick your look →
  optionally connect a database → done).

Once an owner exists, `/admin/install` redirects to `/admin/login`, so it can
never be used to create a second admin.

**Provisioning a production database (optional).** The setup wizard's database
step helps you spin up a managed Postgres on
[Supabase](https://supabase.com) (one-click if you've registered a Supabase
OAuth app — see `.env.example`) or [Neon](https://neon.tech), and copy its
connection string. Because `DATABASE_URL` is read at boot, moving to it means
pasting the string into your env, running `npm run db:migrate`, and restarting
— the wizard guides you but can't hot-swap the primary database. Swapping the
database engine (e.g. SQLite → Postgres) also regenerates the schema; see the
"swap the database" recipe in [docs/recipes/](docs/recipes/).

## Stack

Next.js (App Router) · Drizzle ORM · libSQL/Turso · Stripe · zod.
Storage, email, payments, SMS, AI, and analytics sit behind thin adapters —
see [docs/architecture/adapters.md](docs/architecture/adapters.md) to swap
any of them (including the database) for your own stack.

## Documentation

Start at [docs/README.md](docs/README.md):

- [Getting started](docs/getting-started.md) · [Deployment](docs/deployment.md) · [Configuration](docs/configuration.md)
- [Architecture](docs/architecture/) — blocks, entities, rendering & caching, auth, theming, adapters
- [Entities](docs/entities/) — one guide per content type, each with a
  **"Fit it to your cause"** section and FAQ
- [Recipes](docs/recipes/) — add a block, add a content type, rebrand, swap
  the database, connect Stripe
- [FAQ](docs/faq.md)

## License

License to be chosen by the project owner (placeholder — see LICENSE).

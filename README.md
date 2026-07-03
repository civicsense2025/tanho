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

Want to explore with a full example site? Load an industry sample —
`npm run seed:sample -- tech` (or `artist`, `services`, `nonprofit`). Each is a
fictional, brand-neutral demo that populates every feature with a consistent,
click-through nav; gated features (ecommerce, AI) show a "disabled until
enabled" state. See [docs/getting-started.md](docs/getting-started.md).

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

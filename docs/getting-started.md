# Getting started

## Prerequisites

- Node.js 22+
- npm 10+

No external services are required for local development: the database is a
local libSQL file, uploads go to local disk, and email prints to the console.
Prefer Postgres/Supabase instead? See
[docs/recipes/swap-database-to-postgres.md](recipes/swap-database-to-postgres.md)
before running `npm run db:migrate` below — it's easiest to pick your
database before the first migration, not after.

## Setup

```bash
git clone <your-fork-or-repo-url>
cd lamina-platform
npm install
cp .env.example .env
npm run db:migrate     # creates data/dev.db and applies migrations
npm run seed           # neutral starter content + an owner account
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin — the seed prints the owner login
  credentials to the terminal (change the password on first login).

## Explore with sample content

`npm run seed` gives you a truly empty blank slate (just a home page + owner
account) — right for a real deployment you'll fill yourself.

To explore the platform with a **fully-populated example site** — the way a
fresh WordPress install ships with sample content — load an **industry sample**:

```bash
npm run seed:sample -- tech        # a developer-tools studio
npm run seed:sample -- artist      # an illustrator / print maker
npm run seed:sample -- services    # a consulting firm
npm run seed:sample -- nonprofit   # a community organization
```

Each is a **fictional, brand-neutral** demo that populates every feature —
pages, projects, guides, a shop, blog posts, contacts, bookings — with a
consistent nav where every link resolves (no broken pages). Gated features
render **"disabled until enabled"**: the storefront browses but checkout asks
you to connect Stripe; AI authoring is off until you add a provider key. To
also unlock the store and explore the enabled path:

```bash
SAMPLE_UNLOCK=1 npm run seed:sample -- tech
```

Everything a sample creates is ordinary content you can edit or delete. All
sample brands are invented — replace them before launch.

`npm run seed:demo` loads a separate, richer reference site (the one the design
system ships with) if you want a fuller example.

## Where to go next

- [configuration.md](configuration.md) — environment variables and settings.
- [docs/entities/](entities/) — how each content type works and how to bend
  it to your use case.
- [docs/recipes/restyle-the-brand.md](recipes/restyle-the-brand.md) — make it
  yours: colors, type, logo, name.

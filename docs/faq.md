# FAQ

**Is anything branded in the code?**
No. CI fails if known brand strings appear in `src/` or `docs/`. All copy,
names, colors, and content come from your database (seeded by
`seed/neutral.ts`, which you're meant to edit or replace).

**Can I use a different database / storage / email provider?**
Yes — those are adapter boundaries. See
[architecture/adapters.md](architecture/adapters.md).

**Do I need Stripe?**
Only for commerce, memberships, and paid bookings. Everything else works
without it; those modules show a connect/locked state until keys exist.

**Do I need the platform authors' Google / Stripe / AI accounts?**
No — never. Every integration is **bring-your-own-credentials**: you connect
your *own* Google Cloud OAuth app, your *own* Stripe keys, your *own* AI
provider key. There is no shared or vendor-owned OAuth app, and no call ever
runs on the platform authors' behalf. A fresh clone with zero credentials
boots and runs; each integration degrades to an honest "connect / configure"
state until you wire it. See [entities/integrations.md](entities/integrations.md).

**Where are my OAuth tokens and API keys stored?**
AES-256-GCM encrypted in the `integration_connections` table of your own
database, keyed by your `APP_ENCRYPTION_KEY`. They're decrypted only
server-side at call time and never sent to the browser.

**Who owns the data?**
You do. It's a SQLite-compatible database file (or your Turso instance) plus
an uploads directory. Readers can self-export their data when you enable it
in People settings.

**How do I rename a content type (e.g. Guides → Recipes)?**
See [recipes/rename-an-entity.md](recipes/rename-an-entity.md) — labels are
settings, slugs/routes are editable, and per-entity docs cover the details.

**How is gated (members-only) content protected?**
Server-side. The renderer withholds every block after a paywall from readers
who can't access it — gated content never reaches their HTML. See
[architecture/paywall.md](architecture/paywall.md).

**Can I try it with realistic content?**
`npm run seed:demo` loads a full sample site (portfolio, guides, shop,
newsletter) as ordinary editable content — everything it creates is data you
can change or delete. The neutral `npm run seed` is the brand-agnostic
default.

**How do I upgrade when new versions ship?**
It's your repo — pull and merge like any codebase. Content and settings live
in your database, so upgrades touch code, not your data. Run
`npm run db:migrate` after pulling schema changes.

**Is it accessible?**
Components ship real keyboard focus states, the theme enforces WCAG contrast
on its derived palette, and the design avoids color-only signals. Run your
own audit for your content.

*(Per-entity FAQs live at the bottom of each doc in [entities/](entities/).)*

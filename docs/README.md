# Documentation

Everything you need to run, adapt, and extend the platform.

## Start here

| Doc | What it covers |
| --- | --- |
| [getting-started.md](getting-started.md) | Local setup, first login, seeding |
| [configuration.md](configuration.md) | Every environment variable and settings namespace |
| [deployment.md](deployment.md) | Turso + Vercel, and fully self-hosted |
| [faq.md](faq.md) | Global FAQ (white-labeling, data ownership, upgrades) |

## Architecture

| Doc | What it covers |
| --- | --- |
| [architecture/blocks.md](architecture/blocks.md) | Block registry, Render/resolve contract, adding a block |
| [architecture/entities.md](architecture/entities.md) | Entity schema registry, custom content types |
| [architecture/rendering-caching.md](architecture/rendering-caching.md) | DB routing, cache tags, the server-enforced paywall |
| [architecture/auth.md](architecture/auth.md) | Admin users vs. readers, sessions, roles |
| [architecture/paywall.md](architecture/paywall.md) | Server-enforced membership gating |
| [architecture/theming.md](architecture/theming.md) | Token derivation, white-label theming |
| [architecture/adapters.md](architecture/adapters.md) | Swapping database/storage/email/payments/sms/ai/calendar |
| [portability.md](portability.md) | Portable formats (`oys-theme@1`, `oys-pack@1`, `oys-site@1`), the portability allowlist, and admin import/export workflows |

## Entities — adapt each content type to your cause

One guide per entity under [entities/](entities/), each ending with a
**"Fit it to your cause"** section and FAQ:

[pages](entities/pages.md) · [people](entities/people.md) ·
[memberships](entities/memberships.md) · [products](entities/products.md) ·
[orders](entities/orders.md) · [bookings](entities/bookings.md) ·
[forms](entities/forms.md) · [quiz](entities/quiz.md) ·
[media](entities/media.md) · [analytics](entities/analytics.md) ·
[integrations](entities/integrations.md) · [theme](entities/theme.md)

## Recipes

Task-oriented guides under [recipes/](recipes/): add a block, add a content
type, rename an entity, restyle the brand, swap the database, connect Stripe,
migrate content in.

Migrating from another platform? Start with
[migrate URLs and redirects](recipes/migrate-urls-and-redirects.md), then the
per-platform guide:
[WordPress](recipes/migrate-from-wordpress.md) ·
[Ghost](recipes/migrate-from-ghost.md) ·
[Squarespace](recipes/migrate-from-squarespace.md) ·
[Shopify](recipes/migrate-from-shopify.md) ·
[Webflow](recipes/migrate-from-webflow.md) ·
[Wix](recipes/migrate-from-wix.md).

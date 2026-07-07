---
title: "Deploy on Cloudflare Pages + D1 (Intermediate)"
tagline: "The cheapest real stack here — unmetered bandwidth, a genuinely generous free tier, and a real edge-runtime learning curve"
category: own-your-stack
source_platform: cloudflare-pages
target_platform: cloudflare-d1
difficulty: intermediate
level: intermediate
cost_range_usd: "0-5/mo"
tags: ["hosting", "database", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Comfortable with git, a CLI, and reading error messages"
  - "Can edit config files like wrangler.toml"
  - "Basic SQL (verifying row counts, running queries)"
  - "Familiarity with npm-based build tooling"
requirements:
  - "A Cloudflare account with the Wrangler CLI installed"
  - "Node.js and npm on your machine"
  - "An existing app (ideally Next.js) to deploy"
  - "An existing SQLite database to migrate, if applicable"
effort_hours_min: 4
effort_hours_max: 10
---

# Deploy on Cloudflare Pages + D1 (Intermediate)

If cost is the deciding factor, this is the stack. Cloudflare doesn't charge for bandwidth anywhere in its pricing — static asset requests are unlimited on every plan, including free — and D1's free tier (5 million row reads and 100,000 row writes a day) covers a genuinely large site without you touching a credit card. You've deployed things before, so I'm going to assume you're comfortable with git, a CLI, and reading error messages, and spend this guide on the parts that actually cost time: the wrangler workflow, the Pages Function requirement, and the SQLite migration mechanics.

## Same-vendor pairing, real adoption curve

I want to name this precisely before we get into commands, because it changes how you should think about the friction you're about to hit. Cloudflare Pages and Cloudflare D1 are both Cloudflare products, built by the same team, documented on the same site, billed on the same invoice.

**What's frictionless because it's a same-vendor pairing:**

- No cross-vendor friction — no OAuth dance between two companies
- No networking rule on one side that silently breaks the other
- One dashboard, one bill, one documentation set covering both products
- None of the "database from one vendor won't talk cleanly to a host from another vendor" friction you may have hit elsewhere

**What still takes real adoption effort — this is friction in the platform's execution model, not the vendor pairing:**

- Cloudflare Pages runs your server-side code on the Workers runtime — a V8-isolate-based edge environment, not a Node.js server with unrestricted filesystem and process access
- Frameworks that assume a Node server, Next.js chief among them, need an adapter. The one Cloudflare is actively pushing is `@opennextjs/cloudflare`, now well past its 1.0 beta and shipping frequent point releases (1.20.x as of this writing)
- That adapter uses the Node.js compatibility layer on Workers (`nodejs_compat` flag), which gives you a meaningfully more complete API surface than the older `@cloudflare/next-on-pages` tool, which restricted you to edge-runtime-only code
- Edge runtime support is planned for a future major version of the OpenNext adapter but isn't the default path today — go in expecting Node compat mode
- D1 isn't reachable from a static page directly — you need a Pages Function, a file under `/functions` that runs on the Workers runtime and holds the D1 binding, to issue any query. This is the same mental model as an API route in a traditional app, just filed differently

That's the real distinction to hold onto: **frictionless pairing, real adoption curve.** Don't let "same vendor" trick you into expecting a zero-friction deploy — the friction just lives one layer up, in the runtime model itself, not in the vendor relationship.

## Setting up

> **[🎥 VIDEO PLACEHOLDER]** — a full run-through of the steps below, start to finish
>
> _Replace this callout with the real video before publishing._

```bash
npm i -g wrangler
wrangler login
wrangler d1 create my-database
# Add the returned database_id to wrangler.toml, then:
wrangler pages deploy
```

_wrangler.toml_

```toml
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "<returned-id>"
```

For a Next.js project specifically:

1. Run the OpenNext build step (`opennextjs-cloudflare build`)
2. Deploy with `wrangler pages deploy` (or `wrangler deploy`, depending on whether you're targeting Pages or a plain Worker — more on that distinction below)
3. Let the adapter generate a `wrangler.toml`/`wrangler.jsonc` scaffold for you on first run — you're mainly adding the D1 binding to it after that

Querying D1 from a Pages Function looks like this:

```js
// functions/api/posts.js
export async function onRequest(context) {
  const { results } = await context.env.DB
    .prepare("SELECT * FROM posts ORDER BY created_at DESC LIMIT 20")
    .all();
  return Response.json(results);
}
```

`context.env.DB` is the binding you named in `wrangler.toml`. There's no connection string, no pool to manage — the binding is injected directly into the function's execution context by the runtime.

## Migrating existing data into D1

> **[🎥 VIDEO PLACEHOLDER]** — the data migration command output
>
> _Replace this callout with the real video before publishing._

D1 doesn't accept a raw `.sqlite3` file as an upload target. You convert it to a plain SQL text dump first, then execute that dump against the remote database:

```bash
sqlite3 mydb.sqlite3 .dump > out.sql
# Remove BEGIN TRANSACTION and COMMIT lines from out.sql — D1 handles
# transactional semantics itself and rejects these statements.
wrangler d1 execute my-database --remote --file=out.sql
```

A few concrete things worth knowing before you run this on anything real:

- **The import file is capped at 5 GiB** (same ceiling as an R2 upload), which is generous for almost any SQLite-backed site but worth checking if you're migrating a database with years of accumulated logs or attachments stored as blobs.
- **Virtual tables aren't exportable.** If your source database uses FTS5 (full-text search) or another virtual table extension, drop those tables before exporting, migrate the data, then recreate the virtual tables and repopulate them against D1 afterward.
- **`wrangler d1 export`** is the newer, cleaner counterpart if you're going the other direction — pulling data out of D1 to back it up or move it elsewhere — and supports `--table`, `--no-data`, and `--no-schema` flags if you want a partial export rather than everything.
- **Every query you run through wrangler counts as billable usage**, including the import itself. A large one-time import will spend some of your daily write allowance, which matters if you're testing this against a live production database rather than a fresh one.
- **Run a row-count comparison after the import** (`SELECT COUNT(*) FROM <table>` on both sides) before you consider the migration verified. This isn't optional — partial imports from a stripped transaction file fail silently more often than you'd expect.

> **ℹ️ Note — Pages is being folded into Workers**
>
> Cloudflare has stated plainly that Pages-specific features are being turned into general Workers features rather than maintained as a separate product line.
>
> - As of this writing, Workers has reached feature parity with Pages for static assets, SSR, and custom domains
> - Newer platform capabilities — Secrets Store, Workflows, Containers, Durable Objects — ship Workers-first or Workers-only
> - Cloudflare has not announced a deprecation date for Pages, and existing projects keep working with no forced migration
> - If you're starting fresh today, it's worth deploying straight to a Worker with static assets rather than to Pages, since that's where all new investment is landing
> - If you already have a Pages project, there's no urgency to move it — just don't expect it to gain new capabilities Pages didn't already have

## Go-live checklist

> **[📸 SCREENSHOT PLACEHOLDER]** — the final live site after deploy
>
> _Replace this callout with the real screenshot before publishing._

- D1 database bound correctly in `wrangler.toml`/`wrangler.jsonc` and confirmed reachable from a Pages Function (not just from local `wrangler dev`)
- Row-count check after import matches the source database, table by table
- `nodejs_compat` flag and a compatibility date of `2024-09-23` or later set, if you're on the OpenNext adapter
- Custom domain added — 100 per project on the free tier, more on paid plans

## Sources

- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Cloudflare Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/)
- [D1 import and export data](https://developers.cloudflare.com/d1/best-practices/import-export-data/)
- [D1 Wrangler commands reference](https://developers.cloudflare.com/d1/wrangler-commands/)
- [OpenNext Cloudflare adapter documentation](https://opennext.js.org/cloudflare)
- [Deploying Next.js apps to Cloudflare Workers with the OpenNext adapter (Cloudflare blog)](https://blog.cloudflare.com/deploying-nextjs-apps-to-cloudflare-workers-with-the-opennext-adapter/)
- [Migrate from Pages to Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)

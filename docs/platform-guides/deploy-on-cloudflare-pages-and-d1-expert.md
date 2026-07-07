---
title: "Deploy on Cloudflare Pages + D1 (Expert)"
tagline: "Frictionless pairing, real adoption curve — and a platform in the middle of a Pages-to-Workers consolidation"
category: own-your-stack
source_platform: cloudflare-pages
target_platform: cloudflare-d1
difficulty: intermediate
level: expert
cost_range_usd: "0-5/mo"
tags: ["hosting", "database", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Experience running production infrastructure"
  - "Understands distributed read-replica consistency models"
  - "Can configure CI/CD pipelines (e.g. GitHub Actions)"
  - "Comfortable modeling cost against query read/write patterns"
requirements:
  - "A Cloudflare account, likely on the Workers Paid plan"
  - "A CI/CD pipeline (e.g. GitHub Actions) to automate deploys"
  - "A scoped Cloudflare API token for non-interactive Wrangler use"
  - "An existing D1-backed production or near-production workload"
effort_hours_min: 6
effort_hours_max: 16
---

# Deploy on Cloudflare Pages + D1 (Expert)

You run production infra, so I'll skip the onboarding and go straight at the four things that actually determine whether this stack holds up under load: D1's read-replication behavior, the Workers/Pages platform trajectory, what this costs at real volume, and how to automate it in CI/CD.

## The friction distinction, precisely

Worth stating once, cleanly, since it's the framing this whole guide series uses.

**Zero integration friction of the cross-vendor kind, because Pages and D1 are same-vendor:**

- No auth handshake between separate companies
- No networking rule mismatch
- No billing reconciliation across two vendors

**Real friction, entirely in adopting Cloudflare's execution model:**

- V8-isolate Workers runtime instead of a Node server
- Bindings instead of connection strings
- A framework adapter layer (`@opennextjs/cloudflare`) standing between your app code and the platform if you're on Next.js
- That adapter is mature — past 1.0-beta, iterating fast (1.20.x line as of this writing) — and uses the `nodejs_compat` flag to give you a real Node API surface rather than the more restrictive edge-runtime-only mode of the older `@cloudflare/next-on-pages` tool
- Edge-runtime support is roadmapped for a future major version but isn't the default today

None of this is exotic if you've shipped to Workers before; it is a genuine tax the first time.

## D1's read-replication model

D1's global read replication is in public beta and is the detail that matters most if you're evaluating this for a read-heavy production workload.

- D1 provisions read-only replicas of your database across Cloudflare's network and routes read queries to whichever replica is closest to the requesting Worker, while writes still go to the single primary
- This is architecturally similar to read replicas you'd configure manually on Postgres or MySQL, except it's built into the product with no separate provisioning step
- Notably, there's **no separate billing**: replicated reads bill identically to primary reads, at the same `rows_read` rate, with no extra storage or compute charge for the replicas themselves

The consistency model is the part to actually read closely before you rely on it.

- Because replicas can lag the primary, D1 ships a **Sessions API** that gives you sequential consistency within a session: once a client's session has observed a given state (e.g., after a write), all subsequent reads in that session are guaranteed to reflect at least that state, even if they land on different replicas
- Without using the Sessions API, you're accepting eventual consistency across replicas — fine for a lot of read paths (rendering a blog post, a product listing), riskier for anything that reads-after-write in a single user-facing flow (e.g., "save settings, then immediately show the updated settings")
- Treat this the same way you'd treat any async-replica read path in Postgres: default to the primary or a session-pinned read for anything write-then-read, and let genuinely independent reads hit replicas freely

Since it's beta, validate on a non-production database before pointing production traffic at it, and instrument `rows_read` by replica if you're chasing a specific latency target — the win here is real for globally distributed traffic, but it's not free of the same "which replica did I hit" debugging surface any distributed read layer introduces.

## Workers vs. Pages: what the platform direction means for this stack's stability

This is worth being precise about, because it affects a multi-year infrastructure bet, not just a deploy command. Cloudflare's own engineering leadership has stated the direction plainly: Pages-specific capabilities are being generalized into Workers rather than developed as a parallel product line.

- As of this writing, Workers has reached parity with Pages on static-asset serving, SSR, and custom domains
- Newer platform primitives — Secrets Store, Workflows, Containers, Durable Objects — are Workers-first or Workers-only
- Every recent major feature has landed on Workers before (or instead of) Pages

For this exact stack, that means:

- **D1 itself is not going anywhere and is not Pages-specific** — it's a Workers-platform product that Pages Functions happen to bind into, same as a plain Worker would
- The part that's aging is the Pages *deployment model* (git-integrated builds, the Pages dashboard, the Pages Functions routing convention), not the database layer
- Cloudflare has not published a deprecation timeline, and existing Pages projects keep running with no forced migration
- There's no new capability accruing to Pages that doesn't already exist there, and the gap between what Workers can do and what Pages can do only grows
- If you're standing up new production infrastructure today rather than maintaining an existing Pages project, deploying to a Worker with static assets (rather than to Pages) is the more future-proof default
- D1's binding model is identical either way — migrating the database layer isn't the hard part if you ever do move off Pages; migrating the build/deploy pipeline is

## Cost modeling at volume

**The baseline numbers:**

- Free tier: 5M rows read/day, 100K rows written/day, 5GB storage, reset daily UTC — generous enough that most teams never leave it
- Workers Paid ($5/mo): 25 billion rows read and 50 million rows written per month included
- Overage: $0.001/million reads, $1.00/million writes, plus $0.75/GB-month for storage beyond the included 5GB
- No egress charges apply at any volume — reads, replicated or not, never incur bandwidth cost

**What to actually model — rows *read*, not requests served, because D1 counts scanned rows, not returned rows:**

- An unindexed `WHERE` clause against a 100K-row table costs 100K rows read even if it returns three rows
- Indexing the filtered column is the single highest-leverage cost lever you have, and it's underused because the pricing model doesn't force you to notice until the bill does
- At 25B included monthly reads, you're covered up to roughly 800 million row-scans a day before overage kicks in at $1 per billion rows read — cheap in absolute terms, but a table doing full scans on every request will blow through that far faster than the row count alone suggests
- Writes are the more expensive unit by two orders of magnitude ($1.00/million vs $0.001/million reads), and each indexed column adds a write to maintain the index — worth factoring into schemas with several indexes on a high-write table

Practically: model your read/write ratio against real query patterns (with `EXPLAIN QUERY PLAN` or the `meta.rows_read` field returned on every query) before committing to D1 for a write-heavy workload — this is a read-optimized product by both architecture (replicas) and pricing (reads are ~1000x cheaper per unit than writes).

## Automating via wrangler in CI/CD

Wrangler is fully scriptable and expects to run non-interactively in CI. The pattern that holds up:

```yaml
# .github/workflows/deploy.yml (excerpt)
- name: Run D1 migrations
  run: wrangler d1 migrations apply my-database --remote
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

- name: Deploy
  run: wrangler deploy
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

A few things worth locking down before this runs unattended:

- **Scope the API token narrowly** — D1:Edit and Workers Scripts:Edit on the specific account, not a Global API Key. Wrangler authenticates against `CLOUDFLARE_API_TOKEN` in non-interactive contexts without needing `wrangler login`.
- **Use `wrangler d1 migrations apply` against a named migrations directory** rather than hand-rolled `.sql` files applied via `execute --file` in CI — it tracks which migrations have already run against the target database, which matters once you have more than one environment (preview/staging/prod) pointed at separate D1 databases via `wrangler.toml` environment blocks.
- **Bind preview deployments to a separate preview D1 database.** Cloudflare's Pages/Workers preview URLs can point at their own D1 database so schema changes don't touch production data before a PR merges — set this up explicitly, since it isn't the default.
- **Script around the SQLite dump/import constraints, but don't skip verification.** The 5GiB file-size ceiling on `d1 execute --file` and the requirement to strip `BEGIN TRANSACTION`/`COMMIT` from a raw `sqlite3 .dump` output are both easy to handle with `sed`, but virtual tables (FTS5, etc.) will silently fail to export — don't put that step in an unattended pipeline without an explicit row-count assertion afterward.

## Sources

- [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
- [D1 global read replication](https://developers.cloudflare.com/d1/best-practices/read-replication/)
- [Sequential consistency without borders: how D1 implements global read replication (Cloudflare blog)](https://blog.cloudflare.com/d1-read-replication-beta/)
- [D1 Wrangler commands reference](https://developers.cloudflare.com/d1/wrangler-commands/)
- [D1 import and export data](https://developers.cloudflare.com/d1/best-practices/import-export-data/)
- [OpenNext Cloudflare adapter documentation](https://opennext.js.org/cloudflare)
- [Migrate from Pages to Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)

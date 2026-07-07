---
title: "Deploy on Vercel + Neon (Expert)"
tagline: "Serverless hosting paired with serverless Postgres — a database branch for every preview deploy"
category: own-your-stack
source_platform: vercel
target_platform: neon
level: expert
difficulty: expert
cost_range_usd: "0-40/mo"
tags: ["hosting", "database", "platform-evaluation"]
status: PUBLISHED
last_verified: 2026-07-06
skills_required:
  - "Can build CI/CD pipelines (e.g. GitHub Actions) that create and tear down database branches per PR"
  - "Understands Neon's copy-on-write branching architecture and its cost implications"
  - "Can script infrastructure via CLI/REST API (neonctl, Neon's GitHub Actions, Neon API)"
  - "Can audit and rotate API keys/secrets and enforce TLS on connection strings"
  - "Can model usage-based costs across compute-hours, storage, and bandwidth on two separate bills"
  - "Can verify data portability via pg_dump/pg_restore round-trips outside the platform"
requirements:
  - "A GitHub repository with GitHub Actions CI/CD configured"
  - "A Neon account and project with an API key scoped for CI use"
  - "Vercel and Neon API tokens/secrets stored as CI secrets"
  - "Optionally, neonctl CLI installed locally for scripted branch management"
  - "A process for monitoring cost across both Vercel and Neon billing dashboards"
effort_hours_min: 4
effort_hours_max: 10
---

# Deploy on Vercel + Neon (Expert)

You've run production deploys before. I'll skip the setup narrative and go straight to what matters at this level: how Neon's branching actually works under the hood, how to automate branch-per-PR without relying on the dashboard, what this costs at real scale, how to harden it, and — since this is a migration guide, not a lock-in pitch — how to verify you're not actually stuck here if you decide to leave.

## Frictionless, verified: what I checked and what's real

The premise of every guide in this hub is that the hosting and database pairing has to work without a fight, because these are meant as stepping stones toward owning your own infrastructure, not a new cage. So here's the direct answer: Vercel and Neon's native integration is genuinely low-friction. What works as advertised:

- Provisioning
- Environment-variable injection across Production/Preview/Development scopes
- Branch-per-preview
- Two supported integration modes — Vercel-managed billing vs. Neon-managed billing, your choice

The one non-trivial friction point is structural, not a bug: pooled (PgBouncer transaction-mode) connections don't support session state, so anything relying on prepared statements, advisory locks held across statements, or `SET`-based session config — migrations, `pg_dump`, some ORM migration tooling — must run against the unpooled/direct endpoint. This is a property of connection pooling generally, not a Neon-specific defect, but it's the thing that will actually break your CI if you don't route it correctly.

## Branching under the hood: copy-on-write, not copy

Neon's storage layer decouples compute from storage:

- Postgres compute nodes are stateless and disposable
- Data lives in a separate, non-overwriting storage format organized by WAL (write-ahead log) history rather than as a flat set of files
- A branch is not a data copy; it's a new timeline that starts at a specific LSN (log sequence number) in the parent's WAL history
- Reads on the new branch that touch pages unmodified since the branch point are served transparently from the parent's storage
- Only pages the branch actually writes get materialized separately

That's why branch creation time is independent of database size — creating a branch of a 500MB database and a 500GB database both complete in roughly the same low-single-digit seconds, since neither operation copies bulk data.

The practical implications worth internalizing:

- Branches are cheap to create and destroy, so treat them as ephemeral compute, not persistent infrastructure
- Spin one up per PR, per test run, or per one-off experiment, and tear it down aggressively
- Storage cost for a branch is proportional only to what diverges from its parent, not to the full dataset size
- A fleet of preview branches against a large production database doesn't multiply your storage bill the way naive full-copy branching would

## Automating branch-per-PR beyond the dashboard integration

The Vercel Marketplace integration handles the common case, but at this level you'll often want branch lifecycle tied to your own CI rather than Vercel's preview lifecycle — for example, running migrations and integration tests against an isolated branch before a PR is even eligible for preview deploy. Neon publishes official GitHub Actions (`neondatabase/create-branch-action`, a corresponding delete action, and a schema-diff/compare action) plus a full CLI (`neonctl`) and REST API for scripted branch management.

A typical pattern:

```yaml
# .github/workflows/pr-database.yml (excerpt)
- name: Create Neon branch
  uses: neondatabase/create-branch-action@v5
  id: create-branch
  with:
    project_id: ${{ vars.NEON_PROJECT_ID }}
    branch_name: preview/pr-${{ github.event.number }}
    api_key: ${{ secrets.NEON_API_KEY }}

- name: Run migrations against branch
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ steps.create-branch.outputs.db_url_with_pooler }}
```

```bash
# Equivalent via neonctl, for scripts/local tooling outside CI
neonctl branches create --project-id $NEON_PROJECT_ID --name preview/manual-test
neonctl branches delete preview/manual-test --project-id $NEON_PROJECT_ID
```

The Neon GitHub integration (distinct from the Vercel integration) auto-provisions the `NEON_API_KEY` secret and `NEON_PROJECT_ID` repo variable for you, which removes the usual manual-secret-wiring step. Combine this with Vercel's own integration for the preview URL/env-var side, and you get a pipeline where:

- CI creates and validates a branch before Vercel's preview deploy even finishes building
- Migration failures surface earlier than a preview-only workflow would catch them
- Neither integration requires manual secret management on your end

> **[🎥 VIDEO PLACEHOLDER]** — a CI run creating a Neon branch, running migrations, and tearing the branch down on PR close
>
> _Replace this callout with the real video before publishing._

## Cost modeling at scale

Neon bills compute in CU-hours (a "Compute Unit" is roughly 1 vCPU + 4GB RAM equivalent, and you can size branches from a fraction of a CU up to much larger):

- Compute: approximately $0.106/CU-hour
- Storage: roughly $0.35/GB-month
- No monthly minimum on paid usage-based plans
- Extra branches beyond your plan's included quota run $1.50/branch-month if kept running persistently
- Ephemeral CI/preview branches that scale to zero and get deleted after use largely avoid this cost, since you're billed for actual compute-seconds consumed and the branch itself doesn't accrue a standing charge if deleted promptly

Two levers actually matter for a real cost model:

1. **Scale-to-zero latency and frequency** — if your workload has intermittent traffic, verify your branches are actually suspending on idle rather than being kept warm by health checks or background jobs, since accidental keep-alives silently convert a cheap serverless bill into a much larger always-on one
2. **Branch lifecycle hygiene** — orphaned preview branches from closed-but-not-cleaned-up PRs are the most common source of surprise Neon bills, so the delete-on-merge/close half of the GitHub Actions pair isn't optional if you're running this at team scale

Vercel's own cost curve at scale is driven by:

- Fast Data Transfer (bandwidth) beyond the 1TB Pro allotment at $0.15/GB
- Function execution/edge request volume beyond included quotas
- Model both sides together, since a Neon-backed app with heavy read traffic will show up as cost on both bills simultaneously

## Security hardening

Standard production hardening applies and is worth stating explicitly:

- Rotate the Neon API key used by CI separately from any key used for manual/dashboard access
- Scope it to the minimum required project if Neon's API key permissions support it
- Never let the unpooled/direct connection string leak into a client-exposed environment variable — it should exist only in server-side/CI contexts, never with a `NEXT_PUBLIC_`-style prefix
- Enforce `sslmode=require` on every connection string — Neon requires TLS by default, but verify your ORM or driver isn't silently downgrading
- If you're on the Neon-managed integration, IP allowlisting and role-based Postgres permissions are configured directly in Neon's dashboard/API rather than through Vercel — don't assume Vercel's project-level access controls extend to database-level permissions, because they don't

## Staying portable: verifying you're not actually locked in

The reason this pairing belongs in a migration-guide hub rather than a permanent-recommendation hub is that underneath the branching and the Vercel integration, this is still plain Postgres — and it's worth actually proving that to yourself rather than taking it on faith. Run `pg_dump` against the unpooled connection string and confirm you get a standard, portable Postgres dump with no Neon-proprietary extensions required to restore it elsewhere:

```bash
pg_dump -Fc --no-tablespaces --no-owner --no-acl -d $DATABASE_URL_UNPOOLED -f portability-check.dump
pg_restore --list portability-check.dump | head -20
```

If that dump restores cleanly into a vanilla Postgres instance on any other host — DigitalOcean, Hetzner with self-hosted Postgres, RDS, whatever you migrate to next — you've confirmed the lock-in surface here is genuinely shallow: it's Neon's branching UX and Vercel's integration convenience you'd be giving up, not your actual data or schema.

Two things to check explicitly before you rely on this:

- Audit your schema for any Neon-specific extensions (Neon supports most standard Postgres extensions, but confirm you haven't reached for anything proprietary)
- Audit your application code for anything that talks to Neon's own API (branch creation, the serverless driver's HTTP-based query mode) rather than standard `pg` wire protocol — that's the part that wouldn't travel automatically and would need rewriting on migration

Also worth noting for anyone tracking the corporate context:

- Neon was acquired by Databricks in May 2025 (~$1B)
- Databricks has since GA'd a separate product, "Lakebase," built on Neon's storage engine (February 2026, initially AWS-only)
- Lakebase is a distinct, enterprise/AI-workload-focused product with its own positioning inside Databricks' platform
- It doesn't change Neon.tech's independent pricing or the Vercel integration discussed here, but it's a reasonable signal to watch if you're making a multi-year infrastructure bet and want to track where Databricks' investment attention goes

## Go-live checklist

> **[📸 SCREENSHOT PLACEHOLDER]** — CI pipeline showing branch creation, migration, and teardown steps green across a merged PR
>
> _Replace this callout with the real screenshot before publishing._

- Branch-per-PR automated via GitHub Actions/CLI, with deletion wired to PR close/merge, not left to manual cleanup
- Pooled connection string used exclusively by runtime app code; unpooled reserved for migrations, `pg_dump`, and CI-only contexts
- CI-scoped Neon API key rotated independently from dashboard/personal access keys
- Cost model built against both Neon compute-hours/storage and Vercel bandwidth/function execution, not just one side
- Portability verified via a clean `pg_dump`/`pg_restore` round-trip outside Neon, with any Neon-specific extensions or API usage documented separately

## Sources

- [Neon plans documentation](https://neon.com/docs/introduction/plans) — free tier limits, CU-hour definitions
- [Neon Pricing](https://neon.com/pricing) — usage-based rates, extra-branch pricing
- [Neon architecture overview](https://neon.com/docs/introduction/architecture-overview) — compute/storage separation
- [Neon: instantly copy TB-size datasets (copy-on-write deep dive)](https://neon.com/blog/instantly-copy-tb-size-datasets-the-magic-of-copy-on-write)
- [Neon branching documentation](https://neon.com/docs/introduction/branching)
- [Automate branching with GitHub Actions](https://neon.com/docs/guides/branching-github-actions)
- [Neon create-branch-action (GitHub)](https://github.com/neondatabase/create-branch-action)
- [Neon connection pooling docs](https://neon.com/docs/connect/connection-pooling)
- [Neon: migrate from Postgres via pg_dump/pg_restore](https://neon.com/docs/import/migrate-from-postgres)
- [TechCrunch: Databricks buys Neon for $1B](https://techcrunch.com/2025/05/14/databricks-to-buy-open-source-database-startup-neon-for-1b/)
- [InfoQ: Databricks Lakebase GA, February 2026](https://www.infoq.com/news/2026/02/databricks-lakebase-postgresql/)

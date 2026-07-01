# Business Continuity & Disaster Recovery

Scope: the OYS Hub (the service we operate). Per
[SHARED-RESPONSIBILITY.md](SHARED-RESPONSIBILITY.md), a customer's self-hosted
template deployment's backup/DR is their own responsibility — this runbook
covers what happens if the Hub, or its data, is lost or corrupted.

> **Before relying on this in a real incident:** the RPO/RTO targets below are
> *targets*, not guarantees, until they've been validated by an actual restore
> test (see the checklist at the bottom). An untested backup is not a backup.

## What's at risk, and where it lives

The Hub's `DB_PROVIDER` selects one of three backends (`oys-hub/src/lib/db/adapter-context.ts`):

| Data | Where | Loss impact |
|---|---|---|
| Licenses, activations, releases metadata, audit log | The configured DB (`turso`/`postgres`/`mongodb`) | **Severe** — without this, no customer can activate, check for updates, or be identified for support/renewal. |
| Release ZIPs (the actual signed artifacts) | Vercel Blob (`STORAGE_MODE=blob`) or local filesystem `./storage/` (`STORAGE_MODE=local`) — see `oys-hub/src/lib/blob.ts` | **Severe for existing customers who need to reinstall**, but recoverable: every release can be rebuilt and re-signed from the template repo's tagged commits via `scripts/build-release.ts`, IF the signing key (below) is intact. |
| `ED25519_PRIVATE_KEY` (the release-signing key) | CI secret only (GitHub Actions), never in application data | **Catastrophic and unrecoverable if lost** — losing it doesn't just lose data, it means no future release can ever be validated by CLIs that trust the corresponding public key baked into `oys-cli/src/config.ts`. This key needs its own backup discipline, separate from the DB/blob backup below (a password manager or secrets vault with its own redundancy, not a database backup job). |
| `HUB_ADMIN_TOKEN`, `ENTITLEMENT_SECRET`, `SETTINGS_ENCRYPTION_KEY`, `CRON_SECRET`, `STRIPE_*` | Deploy platform env vars | Recoverable by rotation (see `INCIDENT_RESPONSE.md`) — these are regeneratable, not backup-dependent, though rotating `SETTINGS_ENCRYPTION_KEY` would make any already-encrypted settings unreadable, so back up that one specifically if any settings are in use. |

## Backup procedure by backend

- **Turso/libsql** (default): Turso provides point-in-time recovery and
  scheduled backups on paid plans — confirm this is enabled on whatever plan
  is provisioned; it is not automatic on the free tier. For the local
  file-mode fallback (`file:./db/oys-hub.db`, used when `TURSO_DATABASE_URL`
  is unset — see `oys-hub/src/lib/db/adapters/libsql.ts`), this is a
  **local-dev-only** mode; production must not run on an un-backed-up local
  file.
- **Postgres**: use the host's automated backup feature (managed Postgres
  providers like Neon/Supabase/RDS all offer this) rather than a hand-rolled
  `pg_dump` cron, so restore is a supported, tested path rather than a custom
  script no one has run.
- **MongoDB**: same principle — use Atlas's (or the host's) automated backup,
  not a manual `mongodump` job, unless there's a specific reason a managed
  backup isn't available.
- **Release Blob storage**: Vercel Blob is redundant by the platform's own
  design; the local-filesystem fallback mode has no redundancy and should not
  be the production storage mode for anything beyond a single-operator
  self-hosted Hub that accepts that tradeoff.

## RPO / RTO targets

| Target | Value | Rationale |
|---|---|---|
| **RPO** (max acceptable data loss) | 24 hours | License/activation writes are low-volume (one write per purchase/activation, not per page view) — daily backup cadence is proportionate to actual write frequency, not arbitrary. |
| **RTO** (max acceptable downtime) | 4 hours | The Hub is not in the customer's live request path for their deployed site (their site keeps serving traffic even if the Hub is down — only *new* activations/updates pause, per the Hub's own README). This meaningfully raises the acceptable RTO compared to a service customers depend on for live traffic. |

## Restore test checklist (run this, don't just plan it)

- [ ] Restore the DB backup to a fresh instance (not the production one).
- [ ] Point a local Hub checkout at the restored DB and confirm `migrate()` runs clean and `GET /api/releases` (with a valid admin token) lists the expected releases.
- [ ] Confirm a real license from the restored data can `POST /api/licenses/activate` successfully.
- [ ] Confirm the CLI's `update` command against the restored Hub downloads and verifies a release correctly (exercises the full signed-artifact path, not just the DB).
- [ ] Record how long the restore actually took, and compare against the RTO target above — adjust the target if reality doesn't match.
- [ ] Re-run this checklist at least annually, or after any backend/provider change.

## What does NOT need a backup

Anything derivable from the git repository or regeneratable via rotation
(source code, CI configuration, non-secret env defaults) — only *data* and
the *signing key* need this level of backup discipline.

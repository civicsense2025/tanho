# Access Review Policy

## What "access" means in this system

The template and the Hub deliberately use a **single shared admin credential**
model, not per-user accounts — see `src/lib/auth.ts` (template) and the
Hub's `HUB_ADMIN_TOKEN`/`CRON_SECRET` bearer-token model. This is a real
architectural constraint on what "access review" can mean here, and it's
worth being explicit about rather than writing a generic per-user-account
policy that doesn't match the actual system (see
[SHARED-RESPONSIBILITY.md](SHARED-RESPONSIBILITY.md) — a HIPAA-adjacent
deployment needing per-user access control and reviews is explicitly called
out as needing controls beyond what ships by default).

## Access inventory (what to review)

| Credential | Grants | Where it lives | Review owner |
|---|---|---|---|
| `ADMIN_PASSWORD` / `ADMIN_PASSWORD_HASH` | Full admin access to one template instance (content, settings, subscribers) | That instance's env | The instance operator |
| `ADMIN_SECRET` | Signs the admin session JWT (`src/lib/auth.ts`) — anyone with this can forge a valid session without the password | That instance's env | The instance operator |
| `HUB_ADMIN_TOKEN` | Authorizes publishing releases to the Hub (`oys-hub/src/app/api/releases/*`) — the highest-privilege credential in the whole system, since it gates what customer CLIs will trust | GitHub Actions secret (`ED25519_PRIVATE_KEY` sibling) + the Hub's own env | Us (Hub operators) |
| `ENTITLEMENT_SECRET` | Signs/verifies CLI activation tokens | Hub env | Us |
| `CRON_SECRET` | Authorizes the renewal-reminder cron | Hub env | Us |
| `ED25519_PRIVATE_KEY` | Signs releases — see `BUSINESS_CONTINUITY.md` for why this is the single most sensitive credential in the system | GitHub Actions secret only | Us |
| GitHub repo access (push to `main`, manage Actions secrets) | Can trigger a release, alter CI, or (if compromised) exfiltrate `ED25519_PRIVATE_KEY` | GitHub org/repo permissions | Us |
| Stripe account access (both the Hub's own account for template sales, and each self-hoster's own account for reader payments) | Financial data, payment configuration | Stripe dashboard | Us for the Hub's account; each operator for theirs |
| DB/hosting provider console access | Direct data access, bypassing the app layer entirely | Provider dashboard (Vercel, Turso, Neon, Atlas, etc.) | Whoever provisioned it |

## Review cadence

- **Quarterly**: review the GitHub repo collaborator list, Actions secrets
  access, Stripe account team members, and DB/hosting provider console
  access. Remove anyone who no longer needs it. This is the review an
  auditor will actually ask about for SOC 2/ISO 27001 CC6.1-class controls.
- **On role change**: immediately, not at the next quarterly cycle — when
  someone leaves the team or changes role, revoke what they no longer need
  the same day.
- **After any suspected compromise**: full credential rotation per
  `INCIDENT_RESPONSE.md`, not just a review.

## What the audit log gives you for free

Phase 4.1 added an append-only `audit_log` (see `src/lib/audit.ts` and the
Hub's equivalent) that records `admin.login` (success/failure),
`settings.update`, `content.create/update/delete`, `license.activate/
deactivate/mint/renew/anonymize`, and `release.publish` events with actor,
outcome, and timestamp. **Use this as the evidence trail for access
reviews**: a quarterly review should include pulling recent `admin.login`
failures (possible brute-force or credential-guessing activity — the
lockout in `src/lib/rate-limit.ts` mitigates but doesn't eliminate the
value of checking) and confirming `release.publish` events line up with
actual intended releases, not unexpected activity on `HUB_ADMIN_TOKEN`.

## If/when this moves to per-user accounts

If a future tier needs named users (the HIPAA-adjacent case in
`SHARED-RESPONSIBILITY.md`), this policy should be revised to add: unique
user IDs (HIPAA §164.312(a)(2)(i)), role-based permission tiers, and a
per-user entry in the access inventory above rather than one shared
credential per system component.

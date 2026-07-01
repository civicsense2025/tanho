# Incident Response Plan

Scope: the OYS Hub (the service we operate) and the template's own codebase.
Per [SHARED-RESPONSIBILITY.md](SHARED-RESPONSIBILITY.md), an incident inside a
customer's self-hosted deployment is theirs to run — this plan is for
incidents on infrastructure or code we control.

> **Before relying on this in a real incident:** fill in the placeholder
> contacts below (currently `security@own-your-site.com` throughout this repo
> set — verify that inbox is real and monitored) and name actual humans for
> each role. A plan with no names is a plan nobody will follow at 2am.

## Severity levels

| Level | Definition | Example |
|---|---|---|
| **SEV-1 (Critical)** | Active exploitation, confirmed data breach, or the signed-update trust chain is compromised | An attacker published an unsigned/tampered release that a customer's CLI would accept; a leaked `ED25519_PRIVATE_KEY`; a leaked `HUB_ADMIN_TOKEN`; confirmed unauthorized access to license/customer data |
| **SEV-2 (High)** | Vulnerability confirmed but not (yet) known to be exploited; a control failure that could lead to SEV-1 | A reported auth bypass, a dependency CVE matching `npm audit --audit-level=high` (see `.github/workflows/security.yml`) in a reachable code path, the audit log (`src/lib/audit.ts`) silently failing to write |
| **SEV-3 (Medium)** | Contained issue, no evidence of exploitation, workaround exists | A misconfigured TLS warning (`src/lib/db/tls-check.ts`) on our own Hub deployment, an expired dependency with no known exploit |
| **SEV-4 (Low)** | Hardening gap, best-practice deviation | A `SECURITY.md`-reported issue that's low-impact by design |

## Roles

| Role | Responsibility |
|---|---|
| **Incident Commander (IC)** | Owns the response end-to-end: declares severity, coordinates, decides on customer/public communication. First person to receive a report triages and either acts as IC or names one. |
| **Technical Lead** | Diagnoses, contains, and fixes. For a trust-chain incident (signing key, admin token), this person also handles rotation. |
| **Communications** | Drafts and sends any customer-facing notice. Can be the same person as the IC for a small team. |

## Response process

1. **Detect / receive report.** Via `SECURITY.md`'s contact address, `security.txt`, the CI security-scanning workflows (`npm audit`, CodeQL, gitleaks — see `.github/workflows/security.yml`), or the audit log (`src/lib/audit.ts` / the Hub's equivalent) surfacing anomalous `denied`/`failure` events.
2. **Triage + declare severity** within the timeframes in `SECURITY.md` (acknowledge in 3 business days, initial assessment in 10). A SEV-1 should be triaged immediately, not on that SLA.
3. **Contain.** The concrete containment levers already built into this codebase:
   - **Rotate `HUB_ADMIN_TOKEN` / `ENTITLEMENT_SECRET`** (invalidates all outstanding activation tokens immediately — see `oys-hub/src/lib/tokens.ts`; the hub refuses to boot without them per `oys-hub/src/lib/env.ts`, so redeploy is required after rotation, which is itself a forcing function to confirm the new secret works).
   - **Rotate `ED25519_PRIVATE_KEY`** if the signing key is suspected compromised. This is the highest-severity rotation: it requires publishing a new key, updating `oys-cli/src/config.ts`'s baked public key, and shipping a new CLI version — old CLIs will keep trusting the OLD public key until they update, so this is not instantaneous containment. Treat a signing-key compromise as SEV-1 requiring emergency customer communication, not just a quiet rotation.
   - **Pull a bad release**: the Hub's `POST /api/releases` is idempotent on version (see `oys-hub/src/app/api/releases/route.ts`) — a corrected release can be republished under the same version, or a new patch version pushed immediately.
   - **Lock out the admin account**: the template's login lockout (`src/lib/rate-limit.ts`) already rate-limits brute force; for a suspected compromised admin session, rotate `ADMIN_SECRET` (invalidates all sessions — see `src/lib/auth.ts`) and `ADMIN_PASSWORD`/`ADMIN_PASSWORD_HASH`.
4. **Eradicate + fix.** Ship the code fix through the normal CI gates (`.github/workflows/ci.yml` + `security.yml`).
5. **Recover.** Confirm via the audit log that normal operation has resumed; for a trust-chain incident, confirm a fresh signed release verifies correctly end-to-end (see the CLI's `src/verify.ts` and its test suite).
6. **Notify** (if required — see the Breach Notification section below).
7. **Post-incident review.** Written summary: what happened, detection time, containment time, root cause, and the specific code/process change that prevents recurrence. Add a regression test where practical (see e.g. the TOCTOU regression test pattern in `oys-hub/src/lib/db/adapters/libsql.activation-limit.test.ts` as a model for "found a race condition, wrote a test that proves it's fixed").

## Breach notification

- **HIPAA's 60-day rule** is the reference timeline even though the default
  template has no PHI-handling surface (per `SHARED-RESPONSIBILITY.md`) —
  using it as the baseline means we're never slower than the strictest
  standard we might eventually need to meet. If a future configuration adds
  PHI handling, this becomes a hard legal requirement, not just a good
  practice.
- **State breach-notification laws** vary; if customer PII (license emails,
  in `License.email`) is exposed, timeline requirements may be as short as a
  few days depending on jurisdiction. When in doubt, notify sooner.
- **What to tell affected customers, at minimum**: what happened, what data
  was involved, what we've done to contain it, and what they should do (e.g.
  rotate their own `ADMIN_PASSWORD` if the incident could have exposed
  self-hosted credentials).

## Out of scope for this plan

A customer's self-hosted template deployment security incident is theirs to
run — `SECURITY.md` and `SHARED-RESPONSIBILITY.md` explain the boundary. We
will still accept and triage a report about a *template code* vulnerability
that enabled their incident, even if we can't run their response for them.

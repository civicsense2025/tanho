# Shared Responsibility Matrix

"Own Your Site" (OYS) is a **self-hosted, white-label** template. That has a
direct consequence for security and compliance claims: **we can only certify
and be responsible for the systems we operate.** A customer who deploys this
template controls their own hosting, database, secrets, and (often) their own
domain and TLS termination — and that means they own the corresponding
security decisions too.

This document says, plainly, what falls on which side of that line. It exists
because a self-hosted product cannot honestly claim end-to-end certification
(SOC 2, ISO 27001, HIPAA) the way a fully-hosted SaaS can — see
[SECURITY.md](SECURITY.md) and the OYS Hub's own security docs for how this
maps to our actual compliance posture.

## The three components

| Component | What it is | Who operates it |
|---|---|---|
| **Template** (this repo) | The Next.js site code, deployed by the customer | **The customer** — they choose the host, set the env vars, and run it |
| **OYS Hub** | License validation + signed-update delivery | **Us** — one shared service all customers' CLIs talk to |
| **OYS CLI** | Runs on the customer's machine/CI to activate + update | **The customer** — it's a tool they invoke; it never runs on our infrastructure |

## What we (the OYS maintainers) are responsible for

- **The OYS Hub's own security**: its infrastructure, its database, secret
  management for `HUB_ADMIN_TOKEN`/`ENTITLEMENT_SECRET`/etc., and the Stripe
  integration used for template sales. See `oys-hub/SECURITY.md`.
- **The signed-update supply chain**: keeping the Ed25519 private signing key
  secure (it lives only in the template repo's CI secret, never in a
  customer-reachable location), and making sure only legitimately-built
  releases get signed and published.
- **The template's code as shipped**: vulnerabilities in the default
  configuration, the white-labeling mechanism, and the codebase's own
  security controls (auth, CSRF, sanitization, rate-limiting, audit logging —
  see `SECURITY.md` for the full list of what's in scope for us to fix).
- **Vulnerability disclosure and patching**: triaging reports, shipping fixes,
  and distributing them through the signed-update pipeline so customers can
  pull a patched version.
- **Not shipping secrets or customer data in a release build**: enforced
  mechanically by `scripts/build-release.ts`'s deny/allow-list scan (see the
  SECURITY comment at the top of that file).

## What the customer (the self-hosting operator) is responsible for

- **Where and how they deploy**: choice of hosting provider, server hardening,
  network configuration, and physical/cloud-infrastructure security are
  entirely outside our control once the template is downloaded.
- **Setting real secrets**: `ADMIN_PASSWORD` (or `ADMIN_PASSWORD_HASH`),
  `ADMIN_SECRET`, `SETTINGS_ENCRYPTION_KEY`, database credentials, and any
  third-party API keys (Stripe, email provider, analytics). The template
  refuses to boot in production without the required ones set (see
  `src/lib/auth.ts`), but it cannot force them to be *strong*, and it cannot
  prevent a secret from being mishandled outside the app (e.g. committed to a
  public repo, pasted into a support ticket).
- **Database choice and configuration**: which backend (Turso/Postgres/
  MongoDB), where it's hosted, its access controls, its backup schedule, and
  whether the connection uses TLS. The template warns (but does not block) a
  production deploy that appears to be missing TLS — see
  `src/lib/db/tls-check.ts` — because a same-host or VPN-tunneled private DB
  is a legitimate choice we can't second-guess from the connection string
  alone.
- **TLS/HTTPS termination**: most hosts (Vercel, etc.) handle this
  automatically, but it's the operator's hosting choice, not something the
  template code can enforce.
- **Their own third-party accounts**: their Stripe account (for
  reader-facing payments, if enabled), their email service provider, their
  analytics configuration, and any data-processing agreements those vendors
  require.
- **Access control for their own admin account**: the template supports a
  single shared admin credential by design (see `src/lib/auth.ts`); an
  operator who needs per-user access control and access reviews (e.g. for a
  HIPAA-adjacent use case) needs additional controls beyond what ships here.
- **Their own compliance obligations**: if a customer's *use* of the template
  brings in regulated data (health information, for example), meeting the
  obligations that come with that — BAAs with their own subprocessors, breach
  notification, etc. — is theirs, not ours. **The default template is not
  designed or reviewed for PHI and should not be used to store it.**

## What this means for compliance claims

- A SOC 2 report or ISO 27001 certificate we might obtain would cover **the
  OYS Hub and our own operational practices** — the systems and processes we
  actually run. It would **not** and **could not** cover any individual
  customer's self-hosted deployment, because we have no visibility into or
  control over how they run it.
- We do not claim HIPAA compliance for the default template, because it has
  no PHI-handling surface and we have not built the controls (per-user
  access, BAAs with subprocessors in the data path, etc.) that claim would
  require.
- Any public badge or claim we display should link back to this document so
  the scope is never ambiguous.

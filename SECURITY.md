# Security Policy

> **Before publishing:** verify `security@own-your-site.com` is a real, monitored
> inbox (it's used as the contact address throughout this doc and in
> `public/.well-known/security.txt`). Swap it for whatever address you actually
> want reports sent to if that domain/mailbox isn't set up yet.

"Own Your Site" (OYS) is a self-hosted, white-label site template. Because each
customer deploys and configures their own instance, security responsibility is
shared — see [SHARED-RESPONSIBILITY.md](SHARED-RESPONSIBILITY.md) for exactly
where the line is drawn.

## Reporting a vulnerability

**Do not open a public GitHub issue for a security vulnerability in the
template code itself.**

Email **security@own-your-site.com** with a description, reproduction steps,
and the affected commit/version. We will acknowledge within **3 business
days** and provide an initial assessment within **10 business days**. We'll
credit you in the fix's release notes unless you prefer to remain anonymous,
and we'll agree on a disclosure timeline with you before anything is made
public.

## Scope

**In scope (report to us):**
- A vulnerability in the template's code as shipped — e.g. an auth bypass, an
  injection point, a CSRF gap, or any way the *default configuration* is
  insecure regardless of who deploys it.
- A vulnerability in the white-labeling mechanism itself (`site.config.ts`,
  theme injection, env-var resolution) that could let owner-controlled config
  become an attack vector against site visitors.
- A vulnerability in the signed-update pipeline that this template's CI feeds
  into (`scripts/build-release.ts`, `.github/workflows/release.yml`) — e.g. a
  way to get an unsigned or leaked artifact into a release.

**Out of scope for this repo (these are the deploying customer's
responsibility — see SHARED-RESPONSIBILITY.md):**
- A weak or default `ADMIN_PASSWORD`/`ADMIN_SECRET` on someone's specific
  deployed instance.
- Misconfigured database credentials, missing TLS on a self-managed DB, or
  other deployment-specific hardening gaps (the codebase warns about several
  of these — see `src/lib/db/tls-check.ts`, `src/lib/auth.ts` — but cannot
  enforce them on infrastructure it doesn't control).
- A customer's own third-party integrations (their Stripe account, their ESP,
  their analytics).

## What we consider high severity

- Any way to bypass admin authentication or forge an admin session on a
  correctly-configured instance (i.e. one where `ADMIN_SECRET`/
  `ADMIN_PASSWORD` are set as documented).
- Stored or reflected XSS reachable through content an admin can author (the
  richtext/block pipeline is sanitized via DOMPurify — see
  `src/lib/sanitize.ts` — so a bypass of that sanitization is high severity).
- SQL/NoSQL injection in any DB adapter.
- Any way for the white-label theme/config surface
  (`NEXT_PUBLIC_SITE_*`/`NEXT_PUBLIC_THEME_*`) to break out of its escaped
  sinks into executable markup — see the SECURITY note in
  `src/config/site.config.ts`.
- A Stripe webhook signature bypass, or a way to trust unverified webhook
  payloads.

## Supported versions

The `main` branch is always the supported version. Customers running an older
release should update via the `@own-your-site/cli`'s `update` command before
reporting a bug that may already be fixed upstream.

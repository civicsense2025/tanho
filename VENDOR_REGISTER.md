# Vendor / Subprocessor Register

Every third-party service that touches data flowing through the OYS Hub or
the default template configuration, what data reaches it, and why. Per
[SHARED-RESPONSIBILITY.md](SHARED-RESPONSIBILITY.md), a self-hoster's own
choice of DB host, ESP, or analytics provider is **their** subprocessor
relationship, not ours — this register covers (a) the Hub's own vendors,
which are ours, and (b) the *categories* of vendor a template instance is
likely to introduce, so an operator building their own register has a
starting point.

> **Before relying on this for a real compliance submission:** confirm each
> vendor's current DPA/BAA status directly with them — vendor terms change,
> and this document is a snapshot, not a live feed.

## The Hub's own vendors (our subprocessors)

| Vendor | Data it receives | Purpose | DPA/BAA status |
|---|---|---|---|
| **Stripe** | Checkout email, payment details (Stripe's own PCI-scope, never touches our servers) | Template-sale checkout, license-renewal checkout | Stripe offers a standard DPA; verify it's executed for the account in use. Stripe does not process PHI-appropriate data by default — do not route health information through it. |
| **Database host** (Turso / a managed Postgres / MongoDB Atlas — whichever `DB_PROVIDER` is configured for the Hub) | License records including `email` (see `oys-hub/src/lib/db/types.ts`), the append-only audit log | Primary data store | Depends on provider — Turso, Neon/Supabase, and Atlas each have their own DPA; confirm whichever is in use. |
| **Vercel Blob** (if `STORAGE_MODE=blob`) | Release ZIP contents — build-release.ts's deny-list means these should never contain secrets (see `scripts/build-release.ts`'s SECURITY comment), but confirm that holds before treating Blob as a low-sensitivity store | Signed-release artifact storage | Vercel's standard DPA. |
| **Email provider** (`EMAIL_PROVIDER=resend\|postmark`, or noop by default) | Recipient email, subject, HTML body (license key delivery, renewal reminders) | Transactional email | Both Resend and Postmark offer DPAs; verify whichever is configured. **Neither is a HIPAA-eligible ESP by default** — do not route PHI through transactional email regardless of provider. |
| **GitHub** (Actions, repo hosting) | Source code, CI secrets (`ED25519_PRIVATE_KEY`, `HUB_ADMIN_TOKEN`, etc.) | CI/CD, release signing | GitHub's standard terms; Actions secrets are encrypted at rest by GitHub. |
| **Hosting platform** (wherever the Hub itself is deployed — e.g. Vercel) | Everything — this is the runtime environment | Application hosting | Depends on platform; Vercel has a DPA. |

## Categories a template instance is likely to introduce (operator's own register)

A self-hoster should build their own version of this table for their
specific configuration. The template's `.env.local.example` documents every
optional integration point; the categories are:

| Category | Env vars that indicate it's configured | What to check |
|---|---|---|
| Database | `DB_PROVIDER`, `TURSO_DATABASE_URL`/`POSTGRES_URL`/`MONGODB_URL` | Does the chosen host offer a DPA? Is TLS enforced (`src/lib/db/tls-check.ts` warns but doesn't block)? |
| Payments (reader-facing) | `NEXT_PUBLIC_FEATURE_PAYMENTS`, Stripe keys | This is the OPERATOR's own Stripe account, separate from the Hub's — their subscriber/customer payment data flows through it, their DPA relationship. |
| Email/newsletter | `EMAIL_PROVIDER`, `RESEND_API_KEY`/`POSTMARK_SERVER_TOKEN` | Subscriber emails (`Subscriber.email`, see `src/lib/db/types.ts`) flow to whichever ESP is configured. |
| Analytics | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics — site-visitor data, not customer PII from this app's own DB, but still a subprocessor relationship worth documenting. Affects the CSP (`next.config.ts`) too. |
| File storage | `BLOB_READ_WRITE_TOKEN` | Uploaded media. |
| Content write-through | `GITHUB_TOKEN`, `GITHUB_REPO` | Only if `CONTENT_PROVIDER` isn't forced to `fs` — content changes get pushed to a GitHub repo, meaning that repo is in scope too. |

## Review cadence

Same quarterly cadence as `ACCESS_REVIEW.md` — check this list against what's
actually configured (a stale register that lists a vendor no longer in use,
or omits one that was added, is worse than no register). Add a row the same
day a new integration is turned on in production, not at the next review.

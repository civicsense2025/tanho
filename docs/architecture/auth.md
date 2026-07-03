# Auth

Two principal types, two cookies, one sessions table:

| | Admins (`users`) | Readers (`people`) |
| --- | --- | --- |
| Who | You and your team | Members, subscribers, customers |
| Cookie | `admin_session` | `person_session` |
| Roles | `owner`, `editor` | membership tiers |
| Unlocks | `/admin` | paywalled content, account page |

## How sessions work

- Passwords are hashed with **argon2id** (`modules/auth/password.ts`,
  OWASP parameters).
- A session is a 256-bit random token; the DB stores only its SHA-256
  (`modules/auth/tokens.ts`) — a database leak cannot forge sessions.
- Cookies are httpOnly, SameSite=Lax, Secure in production, with a 30-day
  sliding expiry (renewed at half-life).
- Login is rate-limited per email+IP (DB-backed window, serverless-safe)
  and verifies against a dummy hash when the email is unknown, so timing
  doesn't reveal which emails exist. One generic error message everywhere.

## The security boundary

`src/proxy.ts` only does a cheap cookie-presence redirect. The real checks:

1. `admin/(panel)/layout.tsx` verifies the session before rendering.
2. **Every server action** calls `requireUser()` first — with
   `requireUser("owner")` for settings, payments, people deletion, and
   integrations. Editors get content-only access.

Every mutation lands in `audit_log` (who, what, when).

## Fit it to your cause

- Add roles: extend the `role` enum in `modules/auth/schema.ts` and the
  guard logic in `guards.ts`; everything else reads the session's role.
- SSO/OAuth: sessions are provider-agnostic — add a verification route that
  calls `createAdminSession(userId)` after your IdP round-trip.
- First account: `npm run seed` creates the owner (from `SEED_OWNER_EMAIL`
  / `SEED_OWNER_PASSWORD`, or prints a generated password once).

## FAQ

**Why not Auth.js/NextAuth?** Two principal types with separate tables,
cookies, and lifecycles fight Auth.js's single-session model — and there's
no OAuth requirement here. The custom flow is ~200 lines, all readable.

**Forgot the owner password?** Set a new one from a shell:
`npx tsx -e "import('./src/modules/auth/password').then(async m => console.log(await m.hashPassword('new-password')))"`,
then update the `users` row's `password_hash`.

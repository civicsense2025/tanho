# Codebase Audit — Team / Staff Management

**Date:** 2026-07-07
**Scope:** Existing auth, people, session, audit, and permission primitives the team-management feature will extend or reuse.

---

## 1. Principal model — two deliberately separated tables

The platform keeps admins and readers on separate tables with a shared session table. This is a documented architectural boundary (`docs/architecture/auth.md`, referenced in `src/modules/auth/tokens.ts`).

### `users` table — `src/modules/auth/schema.ts`
```
id            text PK (cuid2)
email         text NOT NULL UNIQUE
name          text NOT NULL
passwordHash  text NOT NULL
role          text enum["owner","editor"] NOT NULL DEFAULT "editor"
status        text enum["active","invited","disabled"] NOT NULL DEFAULT "active"
avatarMediaId text
createdAt     integer NOT NULL
```
- Only two roles today: `owner` (full) and `editor` (everything except owner-gated actions).
- `status` already includes `"invited"` — an invitation flow can use it without a new table.
- **No `roleId`, no `personId`, no MFA fields, no `invitedAt`.** These are the gaps.

### `people` table — `src/modules/people/schema.ts`
CRM: members/subscribers/leads. Has `passwordHash` (nullable, for public member accounts), `emailVerifiedAt`, `tags`, `socials`, `notes`, `lastActiveAt`. Has its own `personActivity` timeline.

### `sessions` table — `src/modules/auth/schema.ts`
```
id         text PK  (SHA-256 hash of the cookie token — DB leak alone can't forge)
kind       text enum["admin","person"] NOT NULL
userId     text   (admin principal)
personId   text   (reader principal)
expiresAt  integer NOT NULL
createdAt  integer NOT NULL
ip         text
userAgent  text
```
- Already dual-principal. **No `label` column** for device naming — gap for session management UI.

### `loginAttempts` — `src/modules/auth/schema.ts`
DB-backed sliding-window limiter, keyed by `email+ip`. Reused by password reset (`auth/reset-actions.ts`). Invitation accept and MFA verify should reuse the same limiter shape.

---

## 2. Auth primitives available for reuse

### Signed tokens — `src/modules/auth/tokens.ts` and `src/modules/people/tokens.ts`
Two deliberately separate copies (comment in `auth/tokens.ts` explains why: `auth/` is more foundational, cross-import would invert the dependency). Same shape:
- `makeSignedToken(purpose, payload, ttlMs)` → `payload.expiry.signature` (base64url)
- `verifySignedToken(purpose, token)` → payload | null (timing-safe HMAC compare)
- HMAC-SHA256 keyed by HKDF-derived 32-byte key from `APP_ENCRYPTION_KEY`
- `auth/tokens.ts` exports `HOUR_MS`; `people/tokens.ts` exports `WEEK_MS`

**Reuse plan:** staff invitations use `auth/tokens.ts` with `purpose: "staff-invite"`, `payload: userId`, `ttlMs: WEEK_MS`. MFA pending-state cookie uses `purpose: "mfa-pending"`, `ttlMs: 15 * 60 * 1000`.

### Sessions — `src/modules/auth/session.ts`
- `createAdminSession(userId, { ip, userAgent })` — sets `admin_session` httpOnly cookie, 30-day expiry, sliding refresh at half-life.
- `getAdminUser()` → `AdminUser | null` (joins sessions + users, rejects `status !== "active"`, deletes expired, sliding-extends).
- `destroyAdminSession()` — current request's cookie.
- `destroyAllSessionsForUser(userId)` — every admin session for a user (used by password reset; reuse for MFA enable / role downgrade / disable).

`AdminUser` type is `{ id, email, name, role: "owner"|"editor" }`. **This type is consumed across the codebase** — extending it with `permissions` must be additive, not breaking.

### Password hashing — `src/modules/auth/password.ts`
`@node-rs/argon2`. `hashPassword`, `verifyPassword`, `dummyHash` (constant-time no-user path). First-owner requires 12-char min; login requires 8-char min. Staff invite-accept should match first-owner's 12-char floor (these accounts own everything).

### Rate limiting — `src/modules/auth/rate-limit.ts`
`allowLoginAttempt(email, ip)`, `clearLoginAttempts(email, ip)`. Reused by reset flow. MFA verify + invite-accept should reuse it.

### First-owner bootstrap — `src/modules/auth/first-owner.ts`
The ONLY web path that creates an admin. Gated by `userCount() === 0`, re-checked inside a transaction (closes the two-deployer race). Reuses `hashPassword` + `createAdminSession`. **This is the structural template for the staff invite-accept action** — same FormData/useActionState shape, same transactional re-check pattern (re-check invite status inside the tx to close replay races).

### Audit log — `src/modules/audit/log.ts` + `schema.ts`
`writeAudit({ userId, action, ownerType?, ownerId?, meta? })` — fire-and-forget, never blocks. Every staff action must audit. Existing action vocabulary: `auth.first-owner-created`, `auth.login`, `auth.logout`, `auth.password_reset`, `people.invite`, `people.update`, etc. New vocabulary: `team.invite`, `team.accept`, `team.role.update`, `team.disable`, `team.remove`, `team.role.create`, `mfa.enroll`, `mfa.disable`, `session.revoke`.

### Settings pattern — `src/modules/people/people-settings.ts`
Zod schema + `readSettingRow`/cached `getPeopleSettings` + `updateTag("settings:people")`. MFA enforcement setting should follow this exact pattern under namespace `team` (or `auth`).

---

## 3. The ~140-call-site backward-compat problem

`requireUser(role?: "owner")` in `src/modules/auth/guards.ts`:
```ts
export async function requireUser(role?: "owner"): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  if (role === "owner" && user.role !== "owner") {
    throw new Error("Forbidden: owner role required");
  }
  return user;
}
```

**Survey:** `requireUser("owner")` is called in **~140 places** across `src/modules/**/actions.ts` (theme, fonts, commerce, content-schema, redirects, data-sources, marketplace, people, domain, policies, forms, tags, custom-types, importers, ai-crawlers, integrations, analytics, chrome, donations, oauth callbacks, api-tokens). `requireUser()` (no role) is called in ~280 more places. `requireApiUser("owner")` mirrors this for bearer-token API routes.

**Implication:** the permission model MUST preserve the `requireUser("owner")` call shape. Strategy:
- Keep `users.role` enum as a "system class" cache (`owner` | `editor` | `custom`).
- Add `users.roleId` FK to a new `roles` table.
- `requireUser("owner")` resolves to: user's role set (via roleId → role_permissions) must include the `team:owner` sentinel permission, OR `users.role === "owner"` (legacy fast path).
- Add `requirePermission(key: string)` for new code. Both go through one permission resolver.
- `AdminUser` gains `permissions: Set<string>` (loaded lazily in `getAdminUser`).
- The 140 existing call sites keep compiling and working unchanged.

`requireApiUser` in `src/modules/auth/api-tokens/guards.ts` mirrors `requireUser` for bearer tokens and must get the same permission-aware extension.

---

## 4. Sub-module structural template — `auth/api-tokens/`

`src/modules/auth/api-tokens/` is the established pattern for a self-contained auth sub-feature:
```
schema.ts       — apiTokens, apiTokenAttempts tables
tokens.ts       — hashApiToken
guards.ts       — requireApiUser (bearer-token guard)
rate-limit.ts   — isApiTokenRateLimited, recordFailedApiTokenAttempt
actions.ts      — server actions (create/revoke/list)
Manager.tsx     — admin UI
```
**`src/modules/auth/mfa/` should mirror this shape** (schema, totp, backup-codes, actions, guards integration). `src/modules/team/` is a top-level module (like `people/`) because it spans roles + invitations + UI.

---

## 5. Test pattern — `auth/first-owner.test.ts`

The canonical test recipe:
- `@libsql/client` file-backed temp DB in `mkdtempSync(tmpdir())` (NOT `:memory:` — libSQL in-memory gives a tx its own connection and loses table visibility).
- `drizzle(client, { schema })` + `migrate(testDb, { migrationsFolder: "./drizzle" })`.
- `vi.mock("@/lib/db/client", () => ({ get db() { return testDb } }))` — getter so each test sees the fresh DB.
- Mock `next/navigation` (`redirect` throws a sentinel `RedirectError`), `next/headers`, `@/modules/audit/log`.
- `beforeEach`: fresh temp DB + migrate + reset install latch; `afterEach`: close + `rmSync`.

All new test files (`team/actions.test.ts`, `team/roles-actions.test.ts`, `auth/guards.test.ts`, `auth/mfa/actions.test.ts`, `auth/session-actions.test.ts`) must follow this exactly.

---

## 6. Migration convention

Migrations are **drizzle-kit generated**, not hand-written. Source of truth is `src/modules/*/schema.ts`, re-exported through `src/lib/db/schema/index.ts`. Workflow:
```sh
npm run db:generate   # drizzle-kit generate → new numbered file under drizzle/
npm run db:migrate    # apply to data/dev.db
npm run seed:reset    # clean reset: drop dev.db, migrate, seed
```
Current migration set: `drizzle/0000`–`0031+`. The team-management schema deltas will produce one or two new numbered migrations. System roles + permissions are seeded via a seed script (not a raw SQL migration) — same as how `people` defaults work.

**Postgres-swap-clean invariant** (see `docs/recipes/swap-database-to-postgres.md`): all schema must be drizzle-idiomatic, no raw SQL types. The new tables must use `sqliteTable` + standard `text`/`integer` columns only.

---

## 7. Admin panel entry point — `src/app/admin/(panel)/layout.tsx`

`AdminPanelLayoutInner` calls `requireUser()` then renders `AdminTopBar` with the user object. **A new "Team" nav item must be added to `AdminTopBar`** (in the settings bucket), gated by a `team:manage` permission. The layout itself only requires a logged-in admin — per-route guards stay in the page/action layer (defense in depth, same as today).

---

## 8. Gaps the team-management feature must fill

| Gap | Where | Filled by |
|---|---|---|
| No staff invitation flow | `users` has `status: "invited"` but no action creates invited users or sends tokens | `team/actions.ts: inviteStaff` + `/admin/accept-invite` route |
| No role management | `users.role` is a 2-value enum, no roles table | `team/schema.ts` roles + permissions + junction |
| No permission granularity | `requireUser` is binary owner/editor | `requirePermission(key)` + permission resolver |
| No MFA | No TOTP secret, no MFA-gated login | `auth/mfa/` sub-module + login flow branch |
| No session management UI | `sessions` table exists but no list/revoke UI | `auth/session-actions.ts` + `/admin/account` |
| No `personId` link on staff | `users` has no CRM link | nullable `users.personId` FK |
| No `invitedAt` / invite tracking | `status: "invited"` exists but no timestamp | `users.invitedAt` column |
| No last-owner protection | Any owner could remove themselves | DB-level check in `removeStaff` / `updateStaffRole` |
| No team nav item | `AdminTopBar` has no Team entry | new nav bucket item, permission-gated |

---

## 9. What does NOT need to be built

- New session table — `sessions` already supports admin principals; just add `label`.
- New rate-limit table — `loginAttempts` shape is reusable.
- New token-signing code — `auth/tokens.ts` is reusable with new `purpose` strings.
- New audit infrastructure — `writeAudit` is reusable with new action vocabulary.
- New password hashing — `auth/password.ts` is reusable.
- IP allowlist / SSO — explicitly out of scope this pass.

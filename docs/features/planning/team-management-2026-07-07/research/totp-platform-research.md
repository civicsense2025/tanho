# TOTP / 2FA Platform Research

**Date:** 2026-07-07
**Scope:** Library selection, RFC compliance, backup-code best practice, and integration constraints for adding TOTP 2FA to the admin auth flow.

---

## 1. Library selection

### TOTP — `otplib` (recommended)

- **Repo:** https://github.com/yeojz/otplib
- **npm:** https://www.npmjs.com/package/otplib
- **Latest stable:** `13.4.1` (also published as `@otplib/totp` on jsDelivr CDN).
- **License:** MIT.
- **RFC compliance:** RFC 6238 (TOTP) + RFC 4226 (HOTP). Google Authenticator compatible out of the box.
- **Zero-config defaults:** 30-second step, 6 digits, SHA-1, 30-second window. These match every authenticator app (Google Authenticator, Authy, 1Password, Raivo) without configuration.
- **API surface we need:**
  - `import { authenticator, secret } from "otplib"`
  - `authenticator.generateSecret()` → base32 secret for enrollment
  - `authenticator.generate(token)` → not needed server-side
  - `authenticator.verify({ token, secret })` → boolean, with built-in ±1 step window
  - `authenticator.keyuri(accountName, issuer, secret)` → `otpauth://totp/...` URI for QR encoding
  - `secret.generateBase32()` for raw secret generation

**Vetting note:** `13.4.1` has been stable for years (the project is in maintenance mode, which is fine for a finished spec). Satisfies the >7-day-age rule. Pin to `^13.4.0` (not `latest`).

### QR rendering — `qrcode.react` (recommended)

- **npm:** https://www.npmjs.com/package/qrcode.react
- **Why a React component, not the `qrcode` CLI lib:** the enroll UI is a server-rendered React component inside the admin panel. `qrcode.react` exports `QRCodeSVG` and `QRCodeCanvas` — drop-in, no canvas/DOM manipulation needed.
- **API:** `<QRCodeSVG value={otpauthUri} size={200} />` renders an inline SVG that scans cleanly.
- **Alternative considered:** `qrcode` (server-side, generates data URLs). Heavier, requires `Buffer`-to-`<img>` plumbing. `qrcode.react` is the lighter fit for this codebase's React-server-component style.

**Both deps to add:**
```sh
npm add otplib@^13.4.0 qrcode.react
```

---

## 2. RFC 6238 constraints that affect the design

- **Time step:** 30 seconds (default, do not change — authenticator apps assume it).
- **Code length:** 6 digits (default).
- **Window:** `otplib`'s `verify` accepts a ±1 step window by default (i.e. the previous, current, and next 30-second codes are valid). This is the standard tolerance for clock drift between the user's phone and the server. **Do not widen it** — wider windows weaken the OTP. Do not narrow it to 0 either — phones and servers drift.
- **Secret encoding:** base32. `authenticator.generateSecret()` returns a base32 string. Store it **encrypted at rest**, not plaintext (see §4).
- **Issuer + account in the URI:** `otpauth://totp/<ISSUER>:<ACCOUNT>?secret=<BASE32>&issuer=<ISSUER>`. The issuer should be the site name (from settings); the account is the user's email. This is what displays in the user's authenticator app.

---

## 3. Backup codes — best practice

Backup codes let a user who has lost their authenticator device regain access. Standard pattern (GitHub, Google, Microsoft all do this):

- Generate **10 single-use codes**, each 8–10 characters, base32-ish (exclude ambiguous chars: `0/O`, `1/I/l`).
- **Hash them at rest** (SHA-256, like session tokens) — a DB leak alone can't use a backup code. Store hashes in a `user_backup_codes` table: `(id, userId, codeHash, usedAt, createdAt)`.
- **Show each code once** at enrollment. The user is told to store them offline. We never display them again.
- **Consume on use:** `verifyBackupCode(userId, code)` → finds a matching unused hash, sets `usedAt`, returns true. A used code is rejected on replay.
- **Regenerate:** owner or user can regenerate, which deletes all existing codes and mints a fresh set. Audit `mfa.backup-codes.regenerate`.
- **Rate-limit** backup-code attempts the same way as TOTP attempts (reuse `loginAttempts`-shaped limiter).

**Why a separate table, not a JSON column on `user_mfa`:** querying "is this code used" and updating a single code's `usedAt` is cleanest as a row update. A JSON array would require read-modify-write under a transaction and is more error-prone. The per-row table matches the codebase's per-row convention (sessions, api_tokens, login_attempts are all per-row).

---

## 4. Secret encryption at rest

The TOTP secret must be encrypted, not plaintext, because:
- A DB dump (backup leak, dev DB committed by accident, read-only SQL access) should not let an attacker mint valid TOTP codes.
- The `APP_ENCRYPTION_KEY` env var already exists and is used for signed tokens (HMAC). For symmetric encryption we need AES, not HMAC.

**Approach:** use `node:crypto`'s `createCipheriv("aes-256-gcm", ...)`:
- Derive a 32-byte key via HKDF-SHA256 from `APP_ENCRYPTION_KEY` with info `"lamina-mfa-secret-v1"` (mirrors the token-signing HKDF pattern in `auth/tokens.ts`).
- Store `iv:ciphertext:authTag` (all base64) in the `user_mfa.secret` column.
- Decrypt on verify. The auth tag prevents tampering.

This adds no new dependency — `node:crypto` is already imported throughout the auth module. **Do NOT reuse the HMAC signing key for encryption** — different HKDF info string, different purpose.

**Dev fallback:** same pattern as `auth/tokens.ts` — if `APP_ENCRYPTION_KEY` is unset, warn once and use an insecure dev fallback. Production must set the env var (already required for signed tokens).

---

## 5. Login flow change — the MFA branch

Current login (`src/modules/auth/actions.ts: loginAction`):
1. Validate email + password (zod).
2. Rate-limit check (`allowLoginAttempt`).
3. Look up user, verify password (argon2, constant-time dummy on no-user).
4. If `status !== "active"` → fail.
5. `clearLoginAttempts`, `createAdminSession`, audit, redirect `/admin`.

**With MFA (only when the user has MFA enabled):**
1–4 unchanged.
5. **New:** if `user.mfaEnabled`:
   a. Do NOT create the admin session.
   b. Mint a signed token `purpose: "mfa-pending"`, `payload: userId`, `ttlMs: 15 * 60 * 1000` (15 min).
   c. Set a short-lived `mfa_pending` httpOnly cookie with that token (sameSite=lax, secure in prod, path="/admin").
   d. Audit `auth.login.mfa-pending`.
   e. Redirect `/admin/login/mfa` (the MFA challenge page).
6. If no MFA: unchanged path.

**MFA challenge action (`verifyMfaAction`):**
1. Read `mfa_pending` cookie, `verifySignedToken("mfa-pending", token)` → userId or fail.
2. Rate-limit check (reuse `allowLoginAttempt` keyed by `userId+ip`).
3. Read `user_mfa` row, decrypt secret.
4. `authenticator.verify({ token: code, secret })` — if true: clear limiter, delete `mfa_pending` cookie, `createAdminSession(userId, ...)`, audit `auth.login.mfa`, redirect `/admin`.
5. If false: check backup codes (`verifyBackupCode`). If a backup code matches: same success path, audit `auth.login.mfa-backup`.
6. If both fail: record attempt, return generic error "Invalid code."

**Critical constraints:**
- The `mfa_pending` cookie is NOT a session — it only authorizes the MFA challenge. It must not be accepted by any other route. The `verifyMfaAction` is the only consumer.
- 15-minute TTL is tight enough to limit attack window, loose enough for a user fumbling with their phone.
- On 3 failed MFA attempts, force the user back to `/admin/login` (clear the pending cookie) — prevents unlimited TOTP guessing through the pending state.

---

## 6. MFA enforcement

- **Org-wide setting:** `team.mfaRequired` boolean in the `team` settings namespace (mirrors `people-settings.ts` pattern). When true, every staff member except the first owner must enroll within 7 days of being invited (grace period tracked by `user_mfa.enforcedAt`).
- **Per-role override:** `roles.requireMfa` boolean column. Lets an owner require MFA only for high-privilege roles.
- **Enforcement point:** `getAdminUser()` checks `mfaRequired && !user.mfaEnabled && pastGrace` → returns null (forces re-login). This is the existing session-resolution path, so enforcement is automatic on next request — no per-route work.
- **First owner exemption:** the install bootstrap creates the first owner without MFA (they need to set it up after first login). The setting enforcement skips users where `users.role === "owner"` AND they are the only owner.

---

## 7. Critical constraints (top 5)

1. **`otplib`'s default window (±1 step) must not be widened.** Wider windows weaken the OTP. Narrower breaks legitimate users with clock drift.
2. **The TOTP secret must be encrypted at rest with AES-GCM, not stored plaintext and not HMAC'd.** A DB leak must not yield usable secrets.
3. **The `mfa_pending` cookie is a single-purpose token, not a session.** Only `verifyMfaAction` consumes it; 15-min TTL; cleared on success, failure-after-3, or expiry.
4. **Backup codes are single-use and hashed.** Replay must fail. Regeneration deletes the old set.
5. **MFA enrollment must not lock out the only owner.** The first owner is exempt from org-wide enforcement until they have enrolled a second factor or explicitly disabled enforcement.

---

## 8. References

- otplib GitHub: https://github.com/yeojz/otplib
- otplib npm: https://www.npmjs.com/package/otplib
- RFC 6238 (TOTP): https://datatracker.ietf.org/doc/html/rfc6238
- RFC 4226 (HOTP): https://datatracker.ietf.org/doc/html/rfc4226
- qrcode.react npm: https://www.npmjs.com/package/qrcode.react
- otpauth URI scheme (Google Authenticator migration spec): https://github.com/google/google-authenticator/wiki/Key-Uri-Format

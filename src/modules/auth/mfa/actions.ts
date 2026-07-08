"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { clientIp } from "@/lib/client-ip";
import { writeAudit } from "@/modules/audit/log";
import { requireUser } from "@/modules/auth/guards";
import { verifyPassword } from "@/modules/auth/password";
import { allowLoginAttempt } from "@/modules/auth/rate-limit";
import {
  createAdminSession,
  destroyAllSessionsForUser,
} from "@/modules/auth/session";
import { HOUR_MS, makeSignedToken, verifySignedToken } from "@/modules/auth/tokens";
import { users } from "@/modules/auth/schema";
import { cookies } from "next/headers";
import { userBackupCodes, userMfa } from "./schema";
import {
  buildOtpauthUri,
  decryptSecret,
  encryptSecret,
  generateSecret,
  verifyTotp,
} from "./totp";
import {
  consumeBackupCode,
  generateBackupCodes,
  hashBackupCode,
} from "./backup-codes";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const MFA_PENDING_COOKIE = "mfa_pending";
const MFA_PENDING_PURPOSE = "mfa-pending";
const MFA_PENDING_TTL = 15 * 60 * 1000; // 15 min
const MAX_VERIFY_FAILS = 3;

// In-process TOTP verify failure counter, keyed by userId. Resets on success
// or when the pending cookie is re-issued (a fresh login). Sufficient for the
// 15-minute pending window — the cookie itself is the hard expiry, this just
// short-circuits brute force within that window.
const verifyFails = new Map<string, number>();

/** Mints the signed `mfa_pending` token for a user mid-login. */
export async function issueMfaPending(userId: string): Promise<void> {
  const token = makeSignedToken(MFA_PENDING_PURPOSE, userId, MFA_PENDING_TTL);
  verifyFails.delete(userId);
  const jar = await cookies();
  jar.set(MFA_PENDING_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MFA_PENDING_TTL / 1000,
  });
}

/**
 * Begins TOTP enrollment for the signed-in admin. Generates a fresh secret
 * (encrypted at rest) and a one-time set of 10 backup codes (hashed at rest),
 * storing both. Returns the otpauth URI (for the QR code) and the RAW backup
 * codes — the only time the codes are visible. Re-calling replaces any prior
 * enrollment + codes (re-enrollment).
 *
 * Audit meta deliberately excludes the secret and the backup codes (CWE-532):
 * audit logs are append-only and lower-trust than the DB; a secret or code
 * leaking there would defeat the at-rest encryption/hashing.
 */
export async function enrollMfa(): Promise<
  Result<{ otpauthUri: string; backupCodes: string[] }>
> {
  const user = await requireUser();

  const secret = generateSecret();
  const encrypted = encryptSecret(secret);

  // Upsert the MFA row — re-enrollment replaces a prior secret.
  await db
    .insert(userMfa)
    .values({ userId: user.id, secret: encrypted })
    .onConflictDoUpdate({ target: userMfa.userId, set: { secret: encrypted } });

  // Replace any prior backup codes (old codes are invalidated).
  await db.delete(userBackupCodes).where(eq(userBackupCodes.userId, user.id));
  const codes = generateBackupCodes(10);
  await db.insert(userBackupCodes).values(
    codes.map((c) => ({ userId: user.id, codeHash: hashBackupCode(c) })),
  );

  await writeAudit({
    userId: user.id,
    action: "mfa.enroll-start",
    meta: { method: "totp" },
  });

  return { ok: true, data: { otpauthUri: buildOtpauthUri(user.email, secret), backupCodes: codes } };
}

/**
 * Confirms TOTP enrollment by verifying a code from the user's authenticator
 * app. On success MFA is considered enabled (enabledAt was stamped at insert).
 * On failure the row is left in place so the user can retry. Rate-limited via
 * the shared login limiter keyed by (email, ip).
 */
export async function verifyMfaEnroll(code: string): Promise<Result> {
  const user = await requireUser();

  const hdrs = await headers();
  const ip = clientIp(hdrs);
  if (!(await allowLoginAttempt(user.email, ip))) {
    return { ok: false, error: "Too many attempts. Try again in a few minutes." };
  }

  const [row] = await db.select().from(userMfa).where(eq(userMfa.userId, user.id));
  if (!row) return { ok: false, error: "MFA is not set up. Start enrollment first." };

  const secret = decryptSecret(row.secret);
  if (!(await verifyTotp(code.trim(), secret))) {
    return { ok: false, error: "That code didn't match. Try again." };
  }

  await writeAudit({ userId: user.id, action: "mfa.enroll" });
  return { ok: true };
}

/**
 * Disables MFA for the signed-in admin. Requires re-authentication (password)
 * since dropping MFA weakens the account — an attacker who hijacked a session
 * shouldn't be able to silently remove the second factor. Tears down every
 * other admin session for the user (a possible attacker session shouldn't
 * survive an MFA disable that's often a response to suspected compromise).
 */
export async function disableMfa(password: string): Promise<Result> {
  const user = await requireUser();

  const [row] = await db.select().from(users).where(eq(users.id, user.id));
  if (!row) return { ok: false, error: "Account not found." };

  if (!(await verifyPassword(row.passwordHash, password))) {
    return { ok: false, error: "Wrong password." };
  }

  await db.delete(userMfa).where(eq(userMfa.userId, user.id));
  await db.delete(userBackupCodes).where(eq(userBackupCodes.userId, user.id));
  await destroyAllSessionsForUser(user.id);

  await writeAudit({ userId: user.id, action: "mfa.disable" });
  return { ok: true };
}

/**
 * Regenerates the backup-code set. Requires re-auth (password) since this
 * reveals fresh one-time codes — a session hijacker shouldn't be able to mint
 * themselves recovery codes. Old codes are invalidated. The raw new codes are
 * returned once.
 */
export async function regenerateBackupCodes(
  password: string,
): Promise<Result<{ codes: string[] }>> {
  const user = await requireUser();

  const [row] = await db.select().from(users).where(eq(users.id, user.id));
  if (!row) return { ok: false, error: "Account not found." };

  if (!(await verifyPassword(row.passwordHash, password))) {
    return { ok: false, error: "Wrong password." };
  }

  await db.delete(userBackupCodes).where(eq(userBackupCodes.userId, user.id));
  const codes = generateBackupCodes(10);
  await db.insert(userBackupCodes).values(
    codes.map((c) => ({ userId: user.id, codeHash: hashBackupCode(c) })),
  );

  await writeAudit({ userId: user.id, action: "mfa.backup-codes.regenerate" });
  return { ok: true, data: { codes } };
}

export type VerifyMfaState = { error?: string };

/**
 * Completes an MFA-gated login. PUBLIC (gated by the `mfa_pending` signed
 * cookie, NOT `requireUser`) — this runs after a correct password but before a
 * session exists. Accepts either a TOTP code or a backup code. After 3 failed
 * attempts the pending cookie is cleared and the user is forced back to login.
 * On success: drops the pending cookie, creates the admin session, redirects.
 */
export async function verifyMfaAction(
  _prev: VerifyMfaState,
  formData: FormData,
): Promise<VerifyMfaState> {
  const jar = await cookies();
  const pending = jar.get(MFA_PENDING_COOKIE)?.value;
  if (!pending) return { error: "Session expired. Please log in again." };

  const userId = verifySignedToken(MFA_PENDING_PURPOSE, pending);
  if (!userId) {
    jar.delete(MFA_PENDING_COOKIE);
    verifyFails.delete(userId ?? "");
    return { error: "Session expired. Please log in again." };
  }

  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Enter your 6-digit code." };

  const [mfaRow] = await db.select().from(userMfa).where(eq(userMfa.userId, userId));
  if (!mfaRow) {
    jar.delete(MFA_PENDING_COOKIE);
    verifyFails.delete(userId);
    return { error: "MFA is not set up for this account." };
  }

  const secret = decryptSecret(mfaRow.secret);

  // TOTP first; only fall back to a backup code if TOTP fails.
  const totpOk = await verifyTotp(code, secret);
  if (totpOk) {
    verifyFails.delete(userId);
    jar.delete(MFA_PENDING_COOKIE);
    await createAdminSession(userId);
    await writeAudit({ userId, action: "auth.login.mfa" });
    redirect("/admin");
  }

  const backupOk = await consumeBackupCode(userId, code);
  if (backupOk) {
    verifyFails.delete(userId);
    jar.delete(MFA_PENDING_COOKIE);
    await createAdminSession(userId);
    await writeAudit({ userId, action: "auth.login.mfa-backup" });
    redirect("/admin");
  }

  // Both failed — count and lock out after MAX_VERIFY_FAILS.
  const fails = (verifyFails.get(userId) ?? 0) + 1;
  if (fails >= MAX_VERIFY_FAILS) {
    verifyFails.delete(userId);
    jar.delete(MFA_PENDING_COOKIE);
    return { error: "Too many failed attempts. Please log in again." };
  }
  verifyFails.set(userId, fails);
  return { error: "That code didn't match. Try again." };
}

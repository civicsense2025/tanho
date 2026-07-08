"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { email as emailAdapter } from "@/adapters/email";
import { writeAudit } from "@/modules/audit/log";
import { hashPassword } from "@/modules/auth/password";
import {
  createAdminSession,
  destroyAllSessionsForUser,
} from "@/modules/auth/session";
import { requirePermission, resolvePermissions } from "@/modules/auth/guards";
import { makeSignedToken, verifySignedToken } from "@/modules/auth/tokens";
import { linkTo } from "@/modules/auth/links";
import { users } from "@/modules/auth/schema";
import { userMfa, userBackupCodes } from "@/modules/auth/mfa/schema";
import { sessions } from "@/modules/auth/schema";
import { inviteSchema, acceptSchema } from "./validation";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/** Signed-token TTL for staff invites — one week. */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const INVITE_PURPOSE = "staff-invite";

/**
 * Resolves whether a role grants the `team:owner` sentinel. Only the Owner
 * system role carries it; a custom role could in principle be granted it, so
 * this checks the live permission set rather than hard-coding the role name.
 */
async function roleHasOwnerSentinel(roleId: string): Promise<boolean> {
  const perms = await resolvePermissions(roleId);
  return perms.has("team:owner");
}

/** Counts users whose role grants `team:owner` (the last-owner guard). */
async function countOwners(): Promise<number> {
  const candidates = await db
    .select({ id: users.id, roleId: users.roleId, role: users.role })
    .from(users)
    .where(eq(users.status, "active"));
  let count = 0;
  for (const c of candidates) {
    if (c.role === "owner") {
      count++;
      continue;
    }
    if (c.roleId && (await roleHasOwnerSentinel(c.roleId))) count++;
  }
  return count;
}

/** True when the user is an owner — by denormalized enum or by permission set. */
async function isOwnerUser(
  user: { role: "owner" | "editor"; roleId: string | null },
): Promise<boolean> {
  if (user.role === "owner") return true;
  if (user.roleId) return await roleHasOwnerSentinel(user.roleId);
  return false;
}

/**
 * Invite a staff member. Creates an `invited` user row (no password yet) and
 * emails a signed accept link. If an invited user with the same email already
 * exists, the invite is re-sent rather than erroring (dedup).
 *
 * SECURITY (CWE-269): if the target role carries the `team:owner` sentinel,
 * the caller must themselves have `team:owner` — an editor with `team:manage`
 * cannot mint an owner.
 */
export async function inviteStaff(
  input: unknown,
): Promise<Result<{ id: string; token: string }>> {
  const caller = await requirePermission("team:manage");
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid invite" };
  }
  const { email, name, roleId, personId } = parsed.data;
  const emailLc = email.toLowerCase();

  // CWE-269: only an owner can assign an owner-granting role.
  if (await roleHasOwnerSentinel(roleId)) {
    if (!caller.permissions.has("team:owner")) {
      return { ok: false, error: "Forbidden: only an owner can assign the Owner role." };
    }
  }

  // Dedup: an existing invited user gets a fresh token + re-sent email.
  const existing = await db.query.users.findFirst({ where: eq(users.email, emailLc) });
  let userId: string;
  if (existing && existing.status === "invited") {
    userId = existing.id;
    await db
      .update(users)
      .set({ name, roleId, personId: personId ?? null, invitedAt: Date.now() })
      .where(eq(users.id, userId));
  } else if (existing) {
    // active/disabled with that email — don't re-invite.
    return { ok: false, error: "A user with that email already exists." };
  } else {
    const [row] = await db
      .insert(users)
      .values({
        email: emailLc,
        name,
        roleId,
        personId: personId ?? null,
        status: "invited",
        // passwordHash is NOT NULL; an invited user has no password yet.
        passwordHash: "",
        invitedAt: Date.now(),
      })
      .returning({ id: users.id });
    userId = row!.id;
  }

  const token = makeSignedToken(INVITE_PURPOSE, userId, WEEK_MS);
  await emailAdapter.send({
    to: emailLc,
    subject: "You're invited to join the team",
    text: `Accept your invitation: ${linkTo("/admin/accept-invite", { token })}\n\nThis link expires in 7 days.`,
  });
  await writeAudit({
    userId: caller.id,
    action: "team.invite",
    ownerId: userId,
    meta: { email: emailLc, roleId },
  });
  return { ok: true, data: { id: userId, token } };
}

/**
 * Accept a staff invite — PUBLIC (token-gated, no `requireUser`). Sets the
 * password and flips status `invited → active`, then logs the user in.
 *
 * SECURITY (CWE-269 mass-assignment): only `token` + `password` are parsed
 * from the form. A `roleId` field, if present, is silently dropped — role
 * assignment is invite-time only.
 *
 * SECURITY (replay/race): the UPDATE is gated on `status = "invited"`; the
 * affected-row count is the closer — if 0 rows matched, someone else (or a
 * replay) already accepted.
 */
export async function acceptInvite(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  // Only token + password are trusted — never roleId (CWE-269).
  const parsed = acceptSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a password of at least 12 characters." };
  }
  const { token, password } = parsed.data;

  const userId = verifySignedToken(INVITE_PURPOSE, token);
  if (!userId) {
    return { error: "This invite link is invalid or has expired. Ask for a new invite." };
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user || user.status !== "invited") {
    return { error: "This invite link is invalid or has expired. Ask for a new invite." };
  }

  const passwordHash = await hashPassword(password);

  // The WHERE status="invited" is the replay-race closer: a concurrent accept
  // (or an already-accepted invite) makes this match 0 rows.
  const updated = await db
    .update(users)
    .set({ passwordHash, status: "active" })
    .where(and(eq(users.id, userId), eq(users.status, "invited")))
    .returning({ id: users.id });
  if (updated.length !== 1) {
    return { error: "This invite has already been used. Ask for a new invite if needed." };
  }

  await createAdminSession(userId);
  await writeAudit({ userId, action: "team.accept" });

  redirect("/admin");
}

/**
 * Change a staff member's role.
 *
 * SECURITY (CWE-269): assigning a role that grants `team:owner` requires the
 * caller to be an owner.
 * SECURITY (CWE-306): a user cannot change their own role.
 * Last-owner protection: demoting the only owner is rejected.
 */
export async function updateStaffRole(userId: string, roleId: string): Promise<Result> {
  const caller = await requirePermission("team:manage");

  if (caller.id === userId) {
    return { ok: false, error: "You cannot change your own role." };
  }

  // CWE-269: only an owner can assign an owner-granting role.
  if (await roleHasOwnerSentinel(roleId)) {
    if (!caller.permissions.has("team:owner")) {
      return { ok: false, error: "Forbidden: only an owner can assign the Owner role." };
    }
  }

  const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!target) {
    return { ok: false, error: "User not found." };
  }

  // Last-owner protection: demoting the only owner would leave the team with
  // no owner at all.
  const targetIsOwner = await isOwnerUser(target);
  const newRoleIsOwner = await roleHasOwnerSentinel(roleId);
  if (targetIsOwner && !newRoleIsOwner && (await countOwners()) <= 1) {
    return { ok: false, error: "Cannot demote the last owner." };
  }

  // The denormalized `role` enum mirrors whether the role grants team:owner.
  const roleEnum: "owner" | "editor" = newRoleIsOwner ? "owner" : "editor";
  await db.update(users).set({ roleId, role: roleEnum }).where(eq(users.id, userId));

  // Revoke the target's other sessions — a role change takes effect now.
  await destroyAllSessionsForUser(userId);

  await writeAudit({
    userId: caller.id,
    action: "team.role.update",
    ownerId: userId,
    meta: { roleId },
  });
  return { ok: true };
}

/**
 * Disable a staff member (keeps the row; revokes access + sessions).
 *
 * SECURITY (CWE-306): cannot disable self.
 * Last-owner protection: cannot disable the last owner.
 */
export async function disableStaff(userId: string): Promise<Result> {
  const caller = await requirePermission("team:manage");

  if (caller.id === userId) {
    return { ok: false, error: "You cannot disable your own account." };
  }

  const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!target) {
    return { ok: false, error: "User not found." };
  }

  if (await isOwnerUser(target)) {
    if ((await countOwners()) <= 1) {
      return { ok: false, error: "Cannot disable the last owner." };
    }
  }

  await db.update(users).set({ status: "disabled" }).where(eq(users.id, userId));
  await destroyAllSessionsForUser(userId);

  await writeAudit({ userId: caller.id, action: "team.disable", ownerId: userId });
  return { ok: true };
}

/**
 * Remove a staff member entirely — deletes the user row and cascades sessions,
 * MFA secrets, and backup codes (deleted first; no FK relies on ON DELETE).
 *
 * SECURITY (CWE-306): cannot remove self.
 * Last-owner protection: cannot remove the last owner.
 */
export async function removeStaff(userId: string): Promise<Result> {
  const caller = await requirePermission("team:manage");

  if (caller.id === userId) {
    return { ok: false, error: "You cannot remove your own account." };
  }

  const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!target) {
    return { ok: false, error: "User not found." };
  }

  if (await isOwnerUser(target)) {
    if ((await countOwners()) <= 1) {
      return { ok: false, error: "Cannot remove the last owner." };
    }
  }

  // Cascade: sessions, MFA, backup codes first, then the user row.
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await db.delete(userBackupCodes).where(eq(userBackupCodes.userId, userId));
  await db.delete(userMfa).where(eq(userMfa.userId, userId));
  await db.delete(users).where(eq(users.id, userId));

  await writeAudit({ userId: caller.id, action: "team.remove", ownerId: userId });
  return { ok: true };
}

/**
 * Resend an invite to an `invited` user — rotates `invitedAt` and mints a
 * fresh signed token (the old one remains valid until it expires; this is
 * intentional — a stale link is harmless, a missing one is not).
 */
export async function resendInvite(userId: string): Promise<Result> {
  const caller = await requirePermission("team:manage");

  const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!target) {
    return { ok: false, error: "User not found." };
  }
  if (target.status !== "invited") {
    return { ok: false, error: "Only pending invites can be resent." };
  }

  const now = Date.now();
  await db.update(users).set({ invitedAt: now }).where(eq(users.id, userId));

  const token = makeSignedToken(INVITE_PURPOSE, userId, WEEK_MS);
  await emailAdapter.send({
    to: target.email,
    subject: "Your team invite (resent)",
    text: `Accept your invitation: ${linkTo("/admin/accept-invite", { token })}\n\nThis link expires in 7 days.`,
  });

  await writeAudit({
    userId: caller.id,
    action: "team.invite.resend",
    ownerId: userId,
  });
  return { ok: true };
}

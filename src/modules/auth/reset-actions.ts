"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { clientIp } from "@/lib/client-ip";
import { email } from "@/adapters/email";
import { writeAudit } from "@/modules/audit/log";
import { hashPassword } from "./password";
import { allowLoginAttempt } from "./rate-limit";
import { destroyAllSessionsForUser } from "./session";
import { HOUR_MS, makeSignedToken, verifySignedToken } from "./tokens";
import { linkTo } from "./links";
import { users } from "./schema";

const RESET_PURPOSE = "admin-reset";

// One generic message regardless of whether the email matched a user — no
// account enumeration via the reset form, same philosophy as loginAction's
// FAILED constant.
const REQUEST_SENT = "If that email is registered, a reset link is on its way.";

export type RequestResetState = { message?: string; error?: string };

const emailSchema = z.string().email().max(254);

/**
 * Request a password-reset email. Always returns the same success message
 * whether or not the email matched an active user — the only observable
 * difference between "matched" and "no match" is that a matched request
 * actually sends mail, which an attacker can't see from the response.
 */
export async function requestPasswordReset(
  _prev: RequestResetState,
  formData: FormData,
): Promise<RequestResetState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Enter a valid email address." };
  const addr = parsed.data.toLowerCase();

  const hdrs = await headers();
  const ip = clientIp(hdrs);
  // Reuses the login rate limiter's table/shape — same DB-backed
  // sliding-window pattern, keyed the same way (email+ip), just a
  // different call site. A reset request costs the same "attempt budget"
  // as a login attempt, which is fine: both are the same class of
  // unauthenticated, email-targeted action.
  if (!(await allowLoginAttempt(addr, ip))) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  const user = await db.query.users.findFirst({ where: eq(users.email, addr) });
  if (user && user.status === "active") {
    const token = makeSignedToken(RESET_PURPOSE, user.id, HOUR_MS);
    await email.send({
      to: addr,
      subject: "Reset your password",
      text: `Reset your password: ${linkTo("/admin/reset-password/confirm", { token })}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
    });
  }
  // No branch on `user` beyond this — same response either way.
  return { message: REQUEST_SENT };
}

export type ConfirmResetState = { error?: string };

const confirmSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(200),
});

/** Confirms a reset token and sets a new password. Invalidates every other
 *  admin session for the user — a reset is often a response to a suspected
 *  compromise, so any existing (possibly attacker) session shouldn't
 *  survive it. */
export async function confirmPasswordReset(
  _prev: ConfirmResetState,
  formData: FormData,
): Promise<ConfirmResetState> {
  const parsed = confirmSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a password of at least 8 characters." };

  const userId = verifySignedToken(RESET_PURPOSE, parsed.data.token);
  if (!userId) return { error: "This reset link is invalid or has expired. Request a new one." };

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user || user.status !== "active") {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));
  await destroyAllSessionsForUser(user.id);
  await writeAudit({ userId: user.id, action: "auth.password_reset" });

  redirect("/admin/login");
}

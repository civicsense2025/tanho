"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { writeAudit } from "@/modules/audit/log";
import { dummyHash, verifyPassword } from "./password";
import { allowLoginAttempt, clearLoginAttempts } from "./rate-limit";
import { users } from "./schema";
import { createAdminSession, destroyAdminSession, getAdminUser } from "./session";

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
});

// One generic message everywhere — no user enumeration.
const FAILED = "Wrong email or password.";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: FAILED };
  const { email, password } = parsed.data;

  const hdrs = await headers();
  const ip = (hdrs.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (!(await allowLoginAttempt(email, ip))) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  // Verify against a dummy hash when no user matches, so both paths cost
  // one argon2 verification.
  const ok = user
    ? await verifyPassword(user.passwordHash, password)
    : (await verifyPassword(await dummyHash(), password), false);

  if (!ok || !user || user.status !== "active") return { error: FAILED };

  await clearLoginAttempts(email, ip);
  await createAdminSession(user.id, {
    ip,
    userAgent: hdrs.get("user-agent") ?? undefined,
  });
  await writeAudit({ userId: user.id, action: "auth.login" });
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  const user = await getAdminUser();
  await destroyAdminSession();
  if (user) await writeAudit({ userId: user.id, action: "auth.logout" });
  redirect("/admin/login");
}

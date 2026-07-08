"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { clientIp } from "@/lib/client-ip";
import { writeAudit } from "@/modules/audit/log";
import { markInstallComplete, userCount } from "@/modules/onboarding/install-state";
import { ensureSystemRolesSeeded } from "@/modules/team/seed";
import { hashPassword } from "./password";
import { users } from "./schema";
import { createAdminSession } from "./session";

/**
 * First-run install: create the very first admin (an `owner`) and log them in.
 *
 * This is the ONLY way to make an admin from the web — normal signup does not
 * exist. It is allowed strictly when `userCount() === 0`; the instant any user
 * exists it refuses, so it can never be used to mint extra owners. It reuses the
 * SAME primitives as the login flow (`hashPassword` + `createAdminSession`) so a
 * first owner is indistinguishable from a seeded one, and stamps the `install`
 * namespace complete so the site-lock proxy lifts.
 *
 * Mirrors loginAction's FormData/useActionState shape so the install form can be
 * a plain <form action={...}> like LoginForm.
 */

const firstOwnerSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email.").max(254),
  // Match the seed's 12-char floor — this is the account that owns everything.
  password: z.string().min(12, "Use at least 12 characters.").max(200),
});

export type FirstOwnerState = { error?: string };

export async function createFirstOwner(
  _prev: FirstOwnerState,
  formData: FormData,
): Promise<FirstOwnerState> {
  // Gate: only when NO admin exists. Re-checked here (not just in the route) so
  // the action is safe on its own, and inside the insert transaction below to
  // close the race where two deployers submit at once.
  if ((await userCount()) > 0) {
    return { error: "This site is already set up. Sign in instead." };
  }

  const parsed = firstOwnerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }
  const { name, email, password } = parsed.data;

  const passwordHash = await hashPassword(password);

  let userId: string;
  try {
    userId = await db.transaction(async (tx) => {
      // Re-check inside the tx: if another request already created the first
      // user, abort rather than create a second owner.
      const existing = await tx.select({ id: users.id }).from(users).limit(1);
      if (existing.length > 0) throw new Error("already-set-up");
      // Ensure the Owner system role + `team:owner` sentinel exist before we
      // create the user — a fresh deploy that skips `npm run seed` has empty
      // roles/permissions tables, and `requireUser("owner")` authorizes via
      // the permission set resolved from `roleId`. Idempotent; rolls back
      // with the user insert on the "already-set-up" race.
      const roleIds = await ensureSystemRolesSeeded(tx);
      const ownerRoleId = roleIds["Owner"];
      const [inserted] = await tx
        .insert(users)
        .values({
          email,
          name,
          passwordHash,
          role: "owner",
          status: "active",
          roleId: ownerRoleId,
        })
        .returning({ id: users.id });
      return inserted.id;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "already-set-up") {
      return { error: "This site is already set up. Sign in instead." };
    }
    throw err;
  }

  const hdrs = await headers();
  const ip = clientIp(hdrs);
  await createAdminSession(userId, { ip, userAgent: hdrs.get("user-agent") ?? undefined });
  await markInstallComplete();
  await writeAudit({ userId, action: "auth.first-owner-created" });

  // Straight into the guided wizard (identity → brand → data source → review).
  // redirect() throws, so this never falls through to a return on success —
  // same control flow as loginAction.
  redirect("/admin/onboarding");
}

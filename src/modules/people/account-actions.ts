"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { clientIp } from "@/lib/client-ip";
import {
  allowLoginAttempt,
  clearLoginAttempts,
} from "@/modules/auth/rate-limit";
import { email as emailAdapter } from "@/adapters/email";
import { dummyHash, hashPassword, verifyPassword } from "./password";
import {
  emailSubscriptions,
  memberships,
  people,
  personActivity,
} from "./schema";
import { createPersonSession, destroyPersonSession } from "./session";
import { getViewer } from "./viewer";
import { logActivity } from "./activity";
import { readPeopleSettings } from "./people-settings";
import { joinSchema, signinSchema } from "./validation";
import { makeSignedToken, verifySignedToken, WEEK_MS } from "./tokens";
import { linkTo } from "./links";

// One generic message everywhere — no account enumeration.
const FAILED = "Wrong email or password.";

export type AuthState = { error?: string; notice?: string };

const clientInfo = async () => {
  const hdrs = await headers();
  return {
    ip: clientIp(hdrs),
    userAgent: hdrs.get("user-agent") ?? undefined,
  };
};

/** Reader signup — respects signups / verifyEmail / approveMembers settings. */
export async function joinAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = joinSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }
  const settings = await readPeopleSettings();
  if (settings.signups === "invite-only") {
    return { error: "Sign-ups are invite-only right now." };
  }

  const emailLc = parsed.data.email.toLowerCase();
  const { ip, userAgent } = await clientInfo();
  if (!(await allowLoginAttempt(emailLc, ip))) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  const existing = await db.query.people.findFirst({
    where: eq(people.email, emailLc),
  });
  if (existing?.passwordHash) {
    // Don't reveal that the account exists — generic failure.
    return { error: FAILED };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  // approveMembers → hold as "invited" until an admin approves.
  const status = settings.approveMembers ? "invited" : "active";

  let personId: string;
  if (existing) {
    // Upgrade a prior subscriber/lead into a member account.
    await db
      .update(people)
      .set({ name: parsed.data.name, kind: "member", status, passwordHash })
      .where(eq(people.id, existing.id));
    personId = existing.id;
  } else {
    const [row] = await db
      .insert(people)
      .values({
        email: emailLc,
        name: parsed.data.name,
        kind: "member",
        status,
        passwordHash,
      })
      .returning({ id: people.id });
    personId = row.id;
  }

  await clearLoginAttempts(emailLc, ip);

  if (settings.verifyEmail) {
    const token = makeSignedToken("verify", personId, WEEK_MS);
    await emailAdapter.send({
      to: emailLc,
      subject: "Confirm your email",
      text: `Verify your email: ${linkTo("/account/verify", { token })}`,
    });
  }

  if (status === "invited") {
    return {
      notice: "Thanks — your account is pending approval. We'll email you when it's ready.",
    };
  }

  await createPersonSession(personId, { ip, userAgent });
  await logActivity(personId, "login", "Signed up");
  redirect("/account");
}

/** Reader sign-in — dummy-hash timing defense, generic error, rate-limited. */
export async function signinAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signinSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: FAILED };

  const emailLc = parsed.data.email.toLowerCase();
  const { ip, userAgent } = await clientInfo();
  if (!(await allowLoginAttempt(emailLc, ip))) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  const person = await db.query.people.findFirst({
    where: eq(people.email, emailLc),
  });

  const ok =
    person?.passwordHash
      ? await verifyPassword(person.passwordHash, parsed.data.password)
      : (await verifyPassword(await dummyHash(), parsed.data.password), false);

  if (!ok || !person || person.status === "unsubscribed") {
    return { error: FAILED };
  }
  if (person.status === "invited") {
    return { error: "Your account is still pending approval." };
  }

  await clearLoginAttempts(emailLc, ip);
  await createPersonSession(person.id, { ip, userAgent });
  await logActivity(person.id, "login", "Signed in");
  redirect("/account");
}

/** Email verification landing — verifies a signed token, sets emailVerifiedAt. */
export async function verifyEmailAction(
  token: string,
): Promise<{ ok: boolean; message: string }> {
  const personId = verifySignedToken("verify", token);
  if (!personId) return { ok: false, message: "This verification link is invalid or expired." };
  await db
    .update(people)
    .set({ emailVerifiedAt: Date.now() })
    .where(eq(people.id, personId));
  return { ok: true, message: "Your email is verified. Thanks!" };
}

export async function signoutAction(): Promise<void> {
  const viewer = await getViewer();
  await destroyPersonSession();
  if (viewer) await logActivity(viewer.personId, "login", "Signed out");
  redirect("/");
}

/** GDPR/CCPA self-export — returns ONLY the requesting viewer's own rows. */
export async function selfExportAction(): Promise<
  { ok: true; data: string } | { ok: false; error: string }
> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Not signed in." };
  const settings = await readPeopleSettings();
  if (!settings.selfExport) return { ok: false, error: "Data export is disabled." };

  const person = await db.query.people.findFirst({
    where: eq(people.id, viewer.personId),
  });
  const activity = await db.query.personActivity.findMany({
    where: eq(personActivity.personId, viewer.personId),
  });
  const memberRows = await db.query.memberships.findMany({
    where: eq(memberships.personId, viewer.personId),
  });
  const subscriptions = await db.query.emailSubscriptions.findMany({
    where: eq(emailSubscriptions.personId, viewer.personId),
  });

  const safe = person
    ? { ...person, passwordHash: undefined, stripeCustomerId: undefined }
    : null;
  return {
    ok: true,
    data: JSON.stringify(
      { person: safe, activity, memberships: memberRows, subscriptions },
      null,
      2,
    ),
  };
}

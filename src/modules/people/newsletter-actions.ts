"use server";

import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { allowLoginAttempt } from "@/modules/auth/rate-limit";
import { email as emailAdapter } from "@/adapters/email";
import { emailSubscriptions, people } from "./schema";
import { logActivity } from "./activity";
import { readPeopleSettings } from "./people-settings";
import { subscribeSchema } from "./validation";
import { subscribeKind } from "./subscribe-policy";
import { makeSignedToken, verifySignedToken, WEEK_MS } from "./tokens";
import { linkTo } from "./links";

export type SubscribeState = { error?: string; notice?: string };

const optInPayload = (email: string, list: string) => `${email}|${list}`;

/**
 * Newsletter signup. Creates/updates a person WITHOUT downgrading an existing
 * member (kind only rises to subscriber for brand-new contacts), and upserts an
 * emailSubscriptions row. Double opt-in → status "pending" + a signed confirm
 * link; otherwise "subscribed" now, with an optional welcome email.
 */
export async function subscribeAction(
  _prev: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const settings = await readPeopleSettings();
  if (!settings.newsletterEnabled) {
    return { error: "Newsletter sign-up is closed right now." };
  }

  const parsed = subscribeSchema.safeParse({
    email: formData.get("email"),
    list: formData.get("list") || settings.defaultList,
  });
  if (!parsed.success) return { error: "Enter a valid email." };
  const emailLc = parsed.data.email.toLowerCase();
  const list = parsed.data.list;

  const hdrs = await headers();
  const ip = (hdrs.get("x-forwarded-for") ?? "local").split(",")[0]!.trim();
  if (!(await allowLoginAttempt(emailLc, ip))) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  // Find-or-create the person; never downgrade an existing member/subscriber.
  // An existing row's `kind` is left untouched (subscribeKind returns it as-is);
  // only a brand-new contact is created as a "subscriber".
  const existing = await db.query.people.findFirst({
    where: eq(people.email, emailLc),
  });
  let personId: string;
  if (existing) {
    personId = existing.id;
  } else {
    const [row] = await db
      .insert(people)
      .values({ email: emailLc, kind: subscribeKind(null), status: "active" })
      .returning({ id: people.id });
    personId = row.id;
  }

  const sub = await db.query.emailSubscriptions.findFirst({
    where: and(
      eq(emailSubscriptions.personId, personId),
      eq(emailSubscriptions.list, list),
    ),
  });
  // Honor an existing unsubscribe: never silently re-enable it here.
  if (sub?.status === "unsubscribed") {
    return {
      notice: "You previously unsubscribed. Use the confirm link in a fresh email to opt back in.",
    };
  }

  if (settings.doubleOptIn) {
    if (!sub) {
      await db
        .insert(emailSubscriptions)
        .values({ personId, list, status: "pending" });
    }
    const token = makeSignedToken("optin", optInPayload(emailLc, list), WEEK_MS);
    await emailAdapter.send({
      to: emailLc,
      subject: "Confirm your subscription",
      text: `Confirm your subscription: ${linkTo("/newsletter/confirm", { token })}`,
    });
    return { notice: "Almost there — check your email to confirm your subscription." };
  }

  // Single opt-in: subscribe immediately.
  if (sub) {
    await db
      .update(emailSubscriptions)
      .set({ status: "subscribed" })
      .where(eq(emailSubscriptions.id, sub.id));
  } else {
    await db
      .insert(emailSubscriptions)
      .values({ personId, list, status: "subscribed" });
  }
  await logActivity(personId, "subscribe", `Subscribed to ${list}`);
  if (settings.welcomeEmail) {
    await emailAdapter.send({
      to: emailLc,
      subject: "Welcome",
      text: "Thanks for subscribing — welcome aboard.",
    });
  }
  return { notice: "You're subscribed. Thanks!" };
}

/** Confirms a double-opt-in subscription from a signed token. */
export async function confirmSubscriptionAction(
  token: string,
): Promise<{ ok: boolean; message: string }> {
  const payload = verifySignedToken("optin", token);
  if (!payload) return { ok: false, message: "This confirmation link is invalid or expired." };
  const [emailLc, list] = payload.split("|");
  if (!emailLc || !list) return { ok: false, message: "This confirmation link is invalid." };

  const person = await db.query.people.findFirst({
    where: eq(people.email, emailLc),
  });
  if (!person) return { ok: false, message: "This confirmation link is invalid." };

  const sub = await db.query.emailSubscriptions.findFirst({
    where: and(
      eq(emailSubscriptions.personId, person.id),
      eq(emailSubscriptions.list, list),
    ),
  });
  const now = Date.now();
  if (sub) {
    await db
      .update(emailSubscriptions)
      .set({ status: "subscribed", doubleOptInAt: now })
      .where(eq(emailSubscriptions.id, sub.id));
  } else {
    await db
      .insert(emailSubscriptions)
      .values({ personId: person.id, list, status: "subscribed", doubleOptInAt: now });
  }
  await logActivity(person.id, "subscribe", `Confirmed subscription to ${list}`);
  return { ok: true, message: "You're confirmed. Thanks for subscribing!" };
}

/**
 * Unsubscribe via a signed token (from an email footer) or the logged-in
 * viewer. An unsubscribe is irreversible here — re-enabling requires a fresh
 * opt-in, per the site's security policy.
 */
export async function unsubscribeAction(
  input: { token?: string; personId?: string; list?: string },
): Promise<{ ok: boolean; message: string }> {
  let personId = input.personId ?? null;
  let list = input.list ?? "default";

  if (input.token) {
    const payload = verifySignedToken("optin", input.token);
    if (!payload) return { ok: false, message: "This unsubscribe link is invalid or expired." };
    const [emailLc, tokenList] = payload.split("|");
    list = tokenList ?? list;
    const person = await db.query.people.findFirst({
      where: eq(people.email, emailLc!),
    });
    personId = person?.id ?? null;
  }
  if (!personId) return { ok: false, message: "Unsubscribe request could not be verified." };

  await db
    .update(emailSubscriptions)
    .set({ status: "unsubscribed" })
    .where(
      and(
        eq(emailSubscriptions.personId, personId),
        eq(emailSubscriptions.list, list),
      ),
    );
  await logActivity(personId, "subscribe", `Unsubscribed from ${list}`);
  return { ok: true, message: "You've been unsubscribed." };
}

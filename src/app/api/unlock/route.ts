import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSettings } from "@/lib/settings";
import { subscribeSchema } from "@/lib/validation/schemas";
import { getActiveSubscriptionByEmail } from "@/lib/db";
import { signSubscriberToken, ACCESS_COOKIE_NAME } from "@/lib/stripe/entitlement";

export const dynamic = "force-dynamic";

/**
 * PUBLIC "unlock paid posts" endpoint. A subscriber submits their email; if it maps to an ACTIVE
 * subscription, we mint a subscriber access token (jose, distinct `reader` audience) and set it as
 * an httpOnly `post_access` cookie. Paid-post pages then grant the body — re-checking the live
 * subscription on every read (verifyPostAccess), so a cancellation revokes access regardless of
 * the cookie's TTL.
 *
 * Enumeration-safe: ALWAYS returns the same generic 200 whether or not the email has a
 * subscription — the response never reveals membership. The token is only ever set as a cookie,
 * never returned in the body. Keep OUT of PROTECTED_API_PREFIXES (public).
 */
export async function POST(req: Request) {
  const settings = await getSettings();
  if (!settings.features.newsletter) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = subscribeSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const sub = await getActiveSubscriptionByEmail(parsed.data.email);
  if (sub) {
    const token = await signSubscriberToken(parsed.data.email);
    (await cookies()).set(ACCESS_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7d, matches the token TTL
    });
  }

  // Same response whether or not a subscription was found (enumeration-safe).
  return NextResponse.json({ ok: true });
}

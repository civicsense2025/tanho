import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getSettings } from "@/lib/settings";
import { getActiveSubscriptionByEmail } from "@/lib/db";
import { verifySubscriberToken, signSubscriberToken, ACCESS_COOKIE_NAME } from "@/lib/stripe/entitlement";

export const dynamic = "force-dynamic";

/**
 * PUBLIC unlock CONFIRM endpoint. Reaching here with a valid token proves the requester received
 * the email we sent to the subscription's address — i.e. they own it. We then RE-CHECK the live
 * subscription (a lot can change in 15 minutes) and, if still active, set the httpOnly
 * post_access cookie and redirect to /posts. The short-lived emailed token is exchanged for a
 * 7-day cookie so the reader isn't re-emailed on every visit; access is still re-verified against
 * the live subscription on every paid-post read. Invalid/expired token → plain 400, no cookie.
 *
 * Keep OUT of PROTECTED_API_PREFIXES (public — the link is clicked from an email).
 */
export async function GET(req: NextRequest) {
  const settings = await getSettings();
  if (!settings.features.newsletter) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const token = req.nextUrl.searchParams.get("token") ?? "";
  const email = await verifySubscriberToken(token);
  // Ownership proven by the emailed token; confirm the subscription is still active right now.
  if (!email || !(await getActiveSubscriptionByEmail(email))) {
    return new NextResponse("This unlock link is invalid or has expired. Please request a new one.", {
      status: 400,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Exchange the short-lived emailed token for a longer-lived httpOnly access cookie.
  const cookieToken = await signSubscriberToken(email, "7d");
  (await cookies()).set(ACCESS_COOKIE_NAME, cookieToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.redirect(new URL("/posts?unlocked=1", settings.url), 303);
}

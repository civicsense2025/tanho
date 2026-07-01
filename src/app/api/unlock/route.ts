import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { subscribeSchema } from "@/lib/validation/schemas";
import { getActiveSubscriptionByEmail } from "@/lib/db";
import { signSubscriberToken } from "@/lib/stripe/entitlement";
import { getEmailProvider } from "@/lib/email/provider";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * PUBLIC "unlock paid posts" REQUEST endpoint. Owning an email must be PROVEN before we grant
 * paid-post access — a plaintext email POST is not proof (anyone could type a subscriber's
 * address). So this route NEVER sets an access cookie: if the email maps to an ACTIVE
 * subscription, it emails a short-lived (15m) magic link; clicking it (GET /api/unlock/confirm)
 * proves inbox control and only THEN sets the httpOnly post_access cookie.
 *
 * Enumeration-safe: always the same generic 200 whether or not the email has a subscription.
 * No cookie, no token in the response body. Keep OUT of PROTECTED_API_PREFIXES (public).
 */
const GENERIC = { message: "If that email has an active subscription, we've sent an unlock link." };

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
    // Best-effort email; never reveal delivery success/failure (enumeration-safe).
    try {
      const token = await signSubscriberToken(parsed.data.email, "15m");
      const link = `${SITE_URL}/api/unlock/confirm?token=${token}`;
      await getEmailProvider().sendTransactional(
        parsed.data.email,
        `Unlock ${settings.siteName} subscriber posts`,
        `<p>Click to unlock subscriber-only posts (link expires in 15 minutes):</p><p><a href="${link}">${link}</a></p>`
      );
    } catch {
      // swallow
    }
  }

  return NextResponse.json(GENERIC, { status: 200 });
}

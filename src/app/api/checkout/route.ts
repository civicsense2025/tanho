import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { checkoutSchema } from "@/lib/stripe/schemas";
import { createOneTimeCheckout, createSubscriptionCheckout, createDonationCheckout } from "@/lib/stripe/checkout";
import { createOrder } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * PUBLIC checkout endpoint (buyers aren't admins). Creates a Stripe Checkout Session and returns
 * its URL for the client to redirect to. The SERVER sets the price — for one-time/subscription
 * from a server-known priceId (which should be validated against a product allowlist by the
 * owner's config), and for donations via Stripe's bounded custom_unit_amount. A pending Order is
 * recorded, keyed by the session id, which the webhook later marks paid.
 *
 * NOTE: keep this route OUT of PROTECTED_API_PREFIXES in proxy.ts (it must be reachable
 * unauthenticated). See the proxy note flagged to the maintainer.
 */
export async function POST(req: Request) {
  // Runtime-gated: the owner toggles payments live in /admin/settings. When off, the route is a
  // 404 and none of the Stripe code below executes.
  const settings = await getSettings();
  if (!settings.features.payments) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { kind, priceId, postId, email } = parsed.data;

  try {
    let session;
    if (kind === "donation") {
      session = await createDonationCheckout({ email });
    } else {
      if (!priceId) {
        return NextResponse.json({ error: "priceId is required for this purchase" }, { status: 400 });
      }
      session =
        kind === "subscription"
          ? await createSubscriptionCheckout({ priceId, email })
          : await createOneTimeCheckout({ priceId, postId, email });
    }

    // Record a pending order the webhook will reconcile. Best-effort — never block checkout on it.
    try {
      await createOrder({
        stripeCheckoutSessionId: session.id,
        stripeCustomerId: null,
        stripePaymentIntentId: null,
        customerEmail: email ?? null,
        kind,
        status: "pending",
        postId: postId ?? null,
        priceId: priceId ?? null,
        amountTotal: null,
        currency: null,
      });
    } catch {
      // A duplicate/racing insert is fine — the webhook upserts by session id.
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] failed", err);
    return NextResponse.json({ error: "Checkout could not be created" }, { status: 500 });
  }
}

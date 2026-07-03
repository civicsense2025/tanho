import { NextResponse, type NextRequest } from "next/server";
import { payments } from "@/adapters/payments";
import { handleStripeEvent } from "@/modules/commerce/stripe-events";

/**
 * Stripe webhook endpoint. Verifies the signature, then hands the event to
 * the single state machine (which is idempotent). Never trusts the body
 * without a valid signature; returns 400 on any verification failure.
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }
  const payload = await req.text();

  let event;
  try {
    event = await payments.constructWebhookEvent(payload, signature);
  } catch (err) {
    console.error("[stripe] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    // Return 500 so Stripe retries; the idempotency ledger makes retries safe.
    console.error("[stripe] event handling failed", event.type, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

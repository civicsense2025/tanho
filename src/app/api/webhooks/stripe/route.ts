import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { verifyEvent, handleEvent } from "@/lib/stripe/webhook";
import { log } from "@/lib/log";

// Node.js runtime (not edge) so constructEvent's sync crypto works — the async SubtleCrypto path
// is only needed on edge runtimes.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PUBLIC Stripe webhook. MUST stay out of both proxy lists so middleware never consumes the raw
 * body the signature check needs (flagged to the maintainer). Reads the RAW body via req.text(),
 * verifies the signature, then handles the event idempotently and returns 2xx fast. A bad
 * signature → 400; a handler error → 500 so Stripe retries.
 */
export async function POST(req: Request) {
  const settings = await getSettings();
  if (!settings.features.payments) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;
  try {
    event = verifyEvent(rawBody, signature);
  } catch (err) {
    // Invalid signature or missing header — never trust the payload.
    return new NextResponse(`Webhook signature verification failed: ${(err as Error).message}`, { status: 400 });
  }

  try {
    await handleEvent(event);
  } catch (err) {
    // Return 500 so Stripe retries; handlers are idempotent so a retry is safe.
    log.error("stripe webhook handler failed", { eventType: event.type, err });
    return new NextResponse("Webhook handler error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}

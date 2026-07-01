import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSubscriberByEmail, createSubscriber, updateSubscriber } from "@/lib/db";
import { parseBody } from "@/lib/validation/parse";
import { subscribeSchema } from "@/lib/validation/schemas";
import { siteConfig } from "@/config/site.config";
import { getEmailProvider } from "@/lib/email/provider";
import { SITE_URL } from "@/lib/seo";

/**
 * Public double-opt-in subscribe. Zod-narrows the email before any DB lookup (injection guard).
 * Enumeration-safe: always returns 202 regardless of whether the email is new, already pending,
 * or already active — the response never reveals membership. New/pending subscribers are (re)issued
 * a confirm token and sent a confirmation email via the provider seam (noop when unconfigured).
 */
export async function POST(req: Request) {
  if (!siteConfig.features.newsletter) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = await parseBody(req, subscribeSchema);
  if (!parsed.ok) return parsed.response;
  const { email } = parsed.data;

  const existing = await getSubscriberByEmail(email);

  // Already active → nothing to do, but respond identically (no enumeration).
  if (existing && existing.status === "active") {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  const confirmToken = randomUUID();
  if (existing) {
    await updateSubscriber(existing.id, { status: "pending", confirmToken });
  } else {
    await createSubscriber({
      email,
      status: "pending",
      confirmToken,
      unsubscribeToken: randomUUID(),
      source: "form",
    });
  }

  // Best-effort confirmation email — never block the response on the ESP.
  try {
    const confirmUrl = `${SITE_URL}/api/subscribe/confirm?token=${confirmToken}`;
    await getEmailProvider().sendTransactional(
      email,
      `Confirm your subscription to ${siteConfig.siteName}`,
      `<p>Please confirm your subscription by clicking <a href="${confirmUrl}">this link</a>.</p>`
    );
  } catch {
    // Swallowed: the subscriber row is saved; a failed send can be retried, and we must not
    // leak ESP state to an anonymous caller.
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}

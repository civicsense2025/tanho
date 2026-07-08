import { eq } from "drizzle-orm";
import { email } from "@/adapters/email";
import { db } from "@/lib/db/client";
import { people } from "@/modules/people/schema";
import { getGeneralSettings } from "@/modules/settings/queries";

/**
 * Send a review-request email to a customer after they've fulfilled an order
 * or been granted an entitlement/membership. Fire-and-forget — never blocks
 * the triggering mutation. Uses the console email adapter in dev (logs to
 * server); a real driver (Resend/SendGrid) is swappable later via EMAIL_DRIVER.
 *
 * Safe by construction: every failure path is caught and logged, so callers
 * can invoke it without await (or via Promise.allSettled) without risking an
 * unhandled rejection that would abort the surrounding mutation.
 */
export async function sendReviewRequestEmail(opts: {
  personId: string;
  targetType: string;
  targetId: string;
  /** Deep link to the review form on the target's public page. */
  deepLink: string;
  /** Optional product/content name for the email subject + body. */
  targetName?: string;
}): Promise<void> {
  try {
    const [person, general] = await Promise.all([
      db.query.people.findFirst({ where: eq(people.id, opts.personId) }),
      getGeneralSettings(),
    ]);
    if (!person?.email) return;
    const subject = opts.targetName
      ? `Review your purchase: ${opts.targetName}`
      : "Review your recent purchase";
    const text = `Hi ${person.name || "there"},\n\nThank you for your purchase from ${general.name}. We'd love to hear what you think!\n\nLeave a review: ${opts.deepLink}\n\n— ${general.name}`;
    await email.send({ to: person.email, subject, text });
  } catch (err) {
    console.error("[reviews] review-request email failed", err);
  }
}

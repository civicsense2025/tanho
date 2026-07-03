import type { memberships } from "@/modules/people/schema";

/** The membership statuses our own table stores (see people/schema.ts). */
export type MembershipStatus = (typeof memberships.$inferSelect)["status"];

/**
 * Collapse Stripe's subscription status vocabulary into the three states our
 * paywall reasons about. Unknown/empty statuses fall back to "canceled" — the
 * safe default (never grant access on a status we don't recognize).
 *
 * active | trialing                          -> active
 * past_due | unpaid | incomplete             -> past_due
 * canceled | incomplete_expired | (anything) -> canceled
 */
export function stripeStatusToMembership(status: string): MembershipStatus {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
    default:
      return "canceled";
  }
}

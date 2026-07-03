type PersonKind = "member" | "subscriber" | "lead";

/**
 * The kind a person should have after a newsletter signup. A brand-new contact
 * becomes a "subscriber"; an EXISTING person is never downgraded — a member
 * stays a member, a lead stays a lead. Subscribing only ever adds a
 * subscription row, never lowers someone's standing.
 */
export function subscribeKind(existing: PersonKind | null): PersonKind {
  return existing ?? "subscriber";
}

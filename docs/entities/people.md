# People (CRM)

Everyone who touches the site who isn't an admin: members, subscribers,
leads, customers. One `people` table with a rich internal profile —
activity timeline, membership, subscription, orders, tags, notes.

## Kinds

- **subscriber** — on a mailing list (double opt-in supported).
- **member** — has an active paid membership (unlocks the paywall).
- **lead** — a contact from a form or inquiry, not yet subscribed.

A person can move between kinds; `subscribeAction` never downgrades a member.

## How people get created

- Reader signup (`/join`) → member/subscriber with a password.
- Form submission → routed per the form's `storeIn` (lead/subscriber/…).
- A booking → the attendee is upserted with a "Booked …" activity.
- A purchase → the customer is linked to their order.
- Admin invite or CSV import.

Each touch logs a `person_activity` entry, so the profile shows a full
timeline.

## Reader accounts vs admin users

Readers (`people`) and admins (`users`) are separate principals with
separate sessions and cookies — see [../architecture/auth.md](../architecture/auth.md).
A reader can never reach `/admin`.

## Privacy

- Unsubscribes are honored irreversibly (no silent re-enable without a fresh
  opt-in).
- Readers can self-export their own data (People settings toggle); the
  export returns only their own rows, with password/Stripe ids stripped.
- Owner-only "Impersonate" is audit-logged.

## Fit it to your cause

- **Newsletter-only**: use subscribers + lists; skip memberships.
- **Membership community**: members + the paywall; grant comp memberships
  from the profile for VIPs.
- **Agency/CRM**: leads + tags + notes + activity as a lightweight sales CRM.

## FAQ

**Can one person see another's data?** No — reader queries are
person-scoped; the account page and account block only resolve the current
viewer.

**How are unsubscribes enforced?** The subscription status flips to
`unsubscribed` and can't be re-enabled without the person opting in again.

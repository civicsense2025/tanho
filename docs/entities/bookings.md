# Bookings (scheduling)

A Calendly-style booking system: define event types, set your weekly
availability, and let visitors book open slots — no double-booking, guest
checkout, manage-by-code.

## Model

- **Event types** (`event_types` table): name, slug, duration, price,
  locations (zoom/meet/phone/in-person), an optional intake form, active
  flag. Configure in **Admin → Scheduling → Event types**.
- **Availability** (settings): weekly hours per day, minimum notice, daily
  cap, before/after buffers, slot increment, timezone.
- **Bookings** (`bookings` table): the confirmed slot, attendee, answers, a
  crypto-random **manage code**, and Google Calendar sync state.

## Availability — the `slotsFor` algorithm

`src/modules/scheduling/slots.ts` is a pure function that computes bookable
start times for a date as:

```
weekly hours  ∩  after (now + min notice)  ∩  under the daily cap
              ∩  clear of buffers  ∩  no overlap with confirmed bookings
```

Each existing booking blocks its own duration plus buffers, so **two people
can't book the same slot**. This is the load-bearing correctness guarantee
and is covered by 12 unit tests (day-off, min-notice, cap, exact-window
block, buffer block, cancelled-ignored, …). `createBooking` re-runs
`slotsFor` on the server before inserting, so a stale or forged slot is
rejected.

## Booking flow

`/book` (pick an event type) → `/book/:slug` (pick a day + time, then intake)
→ confirmation with a manage code and an "add to Google Calendar" link →
`/book/manage/:code` (cancel or reschedule). All guest-friendly; the manage
code is the unguessable auth. Every booking upserts the attendee into People
with an activity entry.

## Google Calendar

Connect is a documented stub today: it flips a settings flag and produces the
"add to calendar" template URL. Real OAuth sync is a hardening item (noted in
`gcal.ts`) — the feature degrades gracefully without it.

## Fit it to your cause

- **Paid consultations**: set a price on the event type (charging is a
  planned extension; free bookings work fully today).
- **Office hours**: one event type, a wide weekly window, a high daily cap.
- **Class sign-ups**: model each session as an event type with a cap of 1
  booking = 1 seat.

## FAQ

**Someone got "No times available" for today.** The minimum-notice window
(default 12h) can exclude all of today's remaining slots — that's expected;
future days show availability.

**Can a guest cancel without an account?** Yes — the manage code in their
confirmation is the auth. Keep it secret; treat it like a password.

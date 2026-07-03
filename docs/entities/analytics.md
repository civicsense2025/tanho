# Analytics

First-party, privacy-respecting analytics plus OAuth-style connect gates for
Google Analytics 4 and Search Console. The site records its own events into
`analytics_events`; the admin surfaces them as an Overview dashboard and a
Traffic report. No third-party script is required, and no PII is stored.

## Data model

`analytics_events` (`src/modules/analytics/schema.ts`):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | cuid2 | Primary key |
| `at` | int (unix ms) | Event time; indexed with `name` |
| `name` | string | Allowlisted event name (`^[a-z0-9_]+$`, ≤40) |
| `path` | string | Page path the event fired on |
| `sessionId` | string | Anonymous per-browser id from an httpOnly cookie |
| `personId` | string? | Set only for signed-in readers (server-derived) |
| `props` | JSON | Small non-PII bag (scalars only, capped + truncated) |

Index: `(name, at)` for the windowed aggregate reads.

`settings.analytics` namespace holds two connect flags: `{ gaConnected,
gscConnected }`.

## How events are recorded

1. **Client** — `components/analytics/beacon.ts` `sendTrack(name, path, props)`
   POSTs to `/api/track` via `navigator.sendBeacon` (falling back to
   `fetch(keepalive)`). It never throws.
2. **Pageviews** — `PageviewBeacon` (mounted once in the public layout) fires a
   `pageview` per path, including on client-side navigation.
3. **CTA events** — the buttons / pricing / newsletter blocks fire their
   `trackEvent` via `TrackedLink` / `TrackedSubscribe` when an author sets one.
4. **Server** — `/api/track` validates the name against the allowlist, mints or
   reads the anonymous session cookie, lightly rate-limits per session, strips
   props to scalars, derives `personId` from the reader session (never the
   client), and inserts via `recordEvent` (parameterized Drizzle).

### Security

- Event name allowlist (`EVENT_NAME_RE`) + length caps are the only gate.
- `sanitizeProps` keeps ≤12 scalar keys, truncates strings — emails, tokens,
  and long free text do not survive it.
- The session id is random (128-bit), httpOnly, SameSite=Lax — **not** a
  fingerprint (no IP, no UA hashing).
- The endpoint always answers `204`, even on bad input, so tracking can never
  break a page, and reflects nothing back to the client.
- A small in-memory fixed-window limiter caps chatty clients per instance.

## Metrics: visitors vs. views

Two numbers per page, and they answer different questions:

- **Views** — every pageview event. The same URL visited ten times is ten
  views. Each visit is its own immutable `analytics_events` row (there is no
  dedup at write time); the count is `count(*)` at read time.
- **Visitors (unique)** — distinct people. The query keys on
  `coalesce(personId, sessionId)`, so a **signed-in reader counts once** even
  across sessions or devices, and an **anonymous browser counts once** by its
  session cookie. Revisiting a page does not increase this number.

Both `topPages()` (per path) and `overview()` (site-wide) use the same
keying, so "Visitors" is consistent between the Overview cards and the
Traffic table. The Traffic table shows Visitors and Views side by side.

> Trade-off: anonymous uniqueness is per-browser-session, so the same person
> on two browsers, or after clearing cookies, counts as two anonymous
> visitors. That's the standard limit of cookieless-friendly, fingerprint-free
> analytics — we count people precisely only once they're logged in.

## Admin screens

- **Overview** (`/admin/analytics/overview`) — connect gate when GA is off;
  otherwise KPI cards (Visitors / Page views / Events / Pages) plus a pure SVG
  bar chart of pageviews over 14 days.
- **Traffic** (`/admin/analytics/traffic`) — connect gate when Search Console
  is off; otherwise a top-pages table with per-page suggestion flags, and a
  (stubbed) search-queries table.

Both screens are editor-viewable; the connect / disconnect actions are
**owner-only** (audited via `saveSettings`). The connect flow is an OAuth-style
STUB that flips a settings flag — see below.

## The connect gates (stubs today)

`connect-actions.ts` exposes `connectGa` / `connectGsc` / `disconnectGa` /
`disconnectGsc`. They flip `settings.analytics` flags and revalidate
`settings:analytics`. There is **no real Google round-trip yet**: the internal
data is always first-party. Wiring real OAuth means adding a `ga4` impl of
`AnalyticsReadAdapter` (see [../architecture/adapters.md](../architecture/adapters.md))
and swapping the connect actions to run the OAuth handshake.

## Fit it to your cause

- **Different events?** Add names to whatever your CTAs set — the allowlist is a
  pattern, not a fixed list, so any `snake_case` name just works. Query them by
  grouping `analytics_events.name`.
- **Self-hosted dashboards only.** If you never want Google, leave both flags
  on in your seed so the screens skip the gate and always show first-party data
  (or delete the gate from the screens).
- **Stricter privacy.** Shorten the anon cookie lifetime in
  `session-cookie.ts`, or drop `sessionId` entirely and count `pageview` rows
  for a cookieless (visitor-less) mode.

## FAQ

**Does this set third-party cookies or load Google's script?** No. Everything is
first-party. The Google "connect" is a local flag until you implement OAuth.

**Where does `personId` come from?** The reader's own session cookie, resolved
server-side in `/api/track`. Clients cannot set it.

**Why is the queries table empty?** Search terms only exist once Search Console
is a real data source; `topQueries()` returns `[]` until then, and the screen
shows an honest empty state.

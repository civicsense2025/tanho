# newsletter

A subscribe band: a title, body, and an email input that posts to the newsletter
signup action. The `Render` component stays pure; the interactive form is a
client island (`modules/people/public/SubscribeForm`).

| Field | Type | Notes |
| --- | --- | --- |
| `title` | string | Heading |
| `body` | string | Supporting copy |
| `placeholder` | string | Email input placeholder |
| `cta` | string | Submit button label |
| `list` | string | List slug the address is added to (default `default`) |
| `trackEvent` | string | Optional analytics event fired on submit (`^[a-z0-9_]+$`) |
| `params` | `Record<string,string>` | Small non-PII props sent with the tracked event |

```json
{ "title": "Subscribe", "cta": "Join", "list": "default", "trackEvent": "newsletter_signup" }
```

When `trackEvent` is set the live-site form is wrapped by
`components/analytics/TrackedSubscribe`, which beacons `/api/track` on submit
(the pure `Render` and the underlying `SubscribeForm` are untouched).

Signup behavior (double opt-in, welcome email, whether signups are enabled) is
governed by the People settings namespace and enforced in `subscribeAction`.
An existing member is never downgraded by subscribing.

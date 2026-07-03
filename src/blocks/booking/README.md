# booking

A bound CTA card that links into the `/book` scheduling flow. Point it at an
event type by slug to feature it (duration + price shown), or leave the slug
blank to link to the full event-type picker. `resolve()` reads the event type
server-side; `Render` stays pure.

| Field | Type | Notes |
| --- | --- | --- |
| `eventTypeSlug` | string | Event type to feature; empty → picker at `/book` |
| `title` | string | Heading override; falls back to the event name |
| `cta` | string | Button label (default `Book a time`) |

```json
{ "eventTypeSlug": "intro-call", "title": "", "cta": "Book a time" }
```

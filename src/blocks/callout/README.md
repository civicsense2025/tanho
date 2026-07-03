# callout

Tinted note card. `info`/`tip` wash in the secondary accent tint, `warning`/`danger`
in the primary accent tint; the border is a translucent mix of the tone ink.

| Field | Type | Notes |
| --- | --- | --- |
| `tone` | `info \| tip \| warning \| danger` | Picks tint + border ink |
| `title` | string | Medium-weight heading line (≤200 chars) |
| `body` | string | Muted supporting text (≤2000 chars) |

```json
{ "tone": "warning", "title": "Heads up", "body": "Double-check your settings before publishing." }
```

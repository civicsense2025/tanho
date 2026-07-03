# code

Monospace code snippet on a surface card. Code is rendered as escaped text —
never injected as HTML.

| Field | Type | Notes |
| --- | --- | --- |
| `filename` | string | Shown in the header bar when set (≤200 chars) |
| `language` | string | Uppercase tag on the right of the bar (≤50 chars) |
| `code` | string | The snippet, escaped verbatim (≤20000 chars) |

```json
{ "filename": "example.ts", "language": "ts", "code": "export const answer = 42;" }
```

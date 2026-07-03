# richtext

Markdown/HTML prose — the workhorse of most pages. Rendered through the
strict server-side sanitizer (`src/lib/sanitize.ts`); raw HTML never
reaches the page.

| Field | Type | Notes |
| --- | --- | --- |
| `md` | string | Markdown source (preferred) |
| `html` | string | Pre-rendered HTML (imports); wins over `md` when set |

```json
{ "md": "It starts with an **export**. Every platform gives you one." }
```

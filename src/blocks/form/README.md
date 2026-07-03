# Form block

Embeds a published form (from the forms builder) into any page. Bound block:
`resolve()` loads the form server-side and only if it's **published**; `Render`
is pure and draws the interactive `FormRenderer` island.

## Fields

| field    | type   | default | notes                                             |
| -------- | ------ | ------- | ------------------------------------------------- |
| `formId` | string | `""`    | id of the form to embed; blank shows a placeholder |

`hideOn` (from `commonContent`) controls per-device visibility.

## Behaviour

- Unset or unpublished form → neutral "No form selected." placeholder.
- The resolved payload is stripped to the public-safe shape
  (`to-public-form.ts`): quiz answer keys (`correct`, `points`) never reach
  the client.
- Submission posts to `submitForm` (honeypot + rate limit + server-side
  validation of every value against the form's own field defs).

## Example JSON

```json
{
  "id": "b_form_1",
  "type": "form",
  "content": { "formId": "abc123" }
}
```

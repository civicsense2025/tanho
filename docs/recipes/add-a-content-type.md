# Add a content type

Two ways, depending on whether you want code or not.

## No-code: the custom-type builder

**Admin → Content → Content types → + New type.** Name it, then add fields
from 16 kinds (text, rich text, number, currency, date, boolean, select,
tags, url, email, color, file, image, reference, json, repeater — repeaters
nest). The platform builds a live validation schema from your field list.
Entries of your type are then editable in admin. Good for structured records
(team members, events, testimonials) without touching code.

## Code: a first-class built-in

For a type that needs custom public templates or bound blocks, add it like
the built-ins:

1. Create `src/entities/schemas/<entity>.ts` — export an `EntitySchema`
   with `entity`, `label`, `plural`, `basePath`, a zod `dataSchema`, and
   `listColumns`.
2. Register it in `src/entities/registry.ts`.
3. Add public rendering: match its `basePath` in
   `src/modules/entries/router.ts` and write a template under
   `src/modules/entries/public/`.
4. (Optional) an admin screen under `src/app/admin/(panel)/content/` using
   the shared `EntityList`, plus a create/edit form.
5. `npm run typecheck`, then create one in admin and view it publicly.

See [../architecture/entities.md](../architecture/entities.md) for how the
registry, `entries` table, and per-entry block content fit together.

## Which should I use?

- **Custom-type builder** — structured data, admin-editable, no deploy.
- **Code** — you need bespoke public layouts, bound blocks, or unusual
  routing.

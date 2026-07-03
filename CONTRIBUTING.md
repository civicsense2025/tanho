# Contributing

## Ground rules

- **White-label discipline.** No brand names, sample copy, demo URLs, or
  personal data in `src/` or `docs/` — CI greps for known strings and fails
  the build. Default copy belongs in `seed/neutral.ts`; demo content in
  `seed/demo-tanho.ts`.
- **Atomized files.** Single responsibility per file; ESLint enforces a
  300-line hard cap (aim for under 200). Split before you cross it.
- **Module layout.** Each domain lives in `src/modules/<name>/` with
  `schema.ts`, `queries.ts`, `actions.ts`, `validation.ts`, `admin/`,
  `public/`. Blocks live in `src/blocks/<type>/` with `def.ts`,
  `Render.tsx`, `resolve.ts`, `fields.ts`, `README.md`.
- **Render purity.** Block `Render` components never fetch data — all server
  work happens in `resolve()`. This keeps the admin canvas and the public
  site on one renderer.
- **Docs with code.** A feature ships with its `docs/entities/*.md` update
  and block `README.md`s in the same PR.
- **No emoji in UI copy.** The design system's brand rule.

## Workflow

```bash
npm run lint && npm run typecheck && npm run test -- --run
npm run check:white-label
```

All four must pass before a PR. Use conventional commits
(`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).

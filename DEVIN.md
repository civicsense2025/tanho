# DEVIN.md — required reading for every session

This document is the entry point for working in this repo. Read it before
making any changes. It pairs with `AGENTS.md` (always-on rules) and the deeper
docs under `docs/`.

---

## Part 1 — Project overview & conventions

### What this is

Lamina Platform — a self-hostable, **white-label** website platform for creators
and small businesses: portfolio + guides + newsletter with memberships + shop
+ booking, managed from a block-based page builder and a full admin panel.
Nothing brand-specific is hardcoded; every name, logo, color, menu, and page
lives in the database. See [README.md](README.md) for the full pitch.

### Stack

Next.js (App Router) · Drizzle ORM · libSQL/Turso · Stripe · zod · Zustand ·
TipTap. Storage, email, payments, SMS, AI, and analytics sit behind thin
adapters — see [docs/architecture/adapters.md](docs/architecture/adapters.md)
to swap any of them (including the database).

> **This is NOT the Next.js you know.** This repo runs a custom Next.js build
> with breaking changes — APIs, conventions, and file structure may all
> differ from your training data. Read the relevant guide in
> `node_modules/next/dist/docs/` before writing any Next.js code. Heed
> deprecation notices. (See `AGENTS.md`.)

### Directory layout

- `src/modules/<name>/` — each domain lives here with `schema.ts`,
  `queries.ts`, `actions.ts`, `validation.ts`, `admin/`, `public/`.
- `src/blocks/<type>/` — each block has `def.ts`, `Render.tsx`, `resolve.ts`,
  `fields.ts`, `README.md`. ~40 block types across content, layout, media,
  data, commerce, interactive, newsletter, and dynamic categories.
- `src/editor/` — the block-based page builder (canvas, inspector, layers,
  gridlines, TipTap richtext).
- `src/entities/` — entity schema registry and custom content-type builder.
- `src/adapters/` — thin swappable adapters (db, storage, email, payments,
  sms, ai, calendar).
- `src/app/` — Next.js App Router routes (site + `/admin`).
- `drizzle/` — migrations. `seed/` — neutral/demo/sample seeders.
- `docs/` — architecture, entities, recipes, getting-started.

### Conventions (load-bearing)

- **White-label discipline.** No brand names, sample copy, demo URLs, or
  personal data in `src/` or `docs/` — CI greps for known strings and fails
  the build. Default copy belongs in `seed/neutral.ts`; demo content in
  `seed/demo-tanho.ts`.
- **Atomized files.** Single responsibility per file; ESLint enforces a
  300-line hard cap (aim for under 200). Split before you cross it.
- **Render purity.** Block `Render` components never fetch data — all server
  work happens in `resolve()`. This keeps the admin canvas and the public
  site on one renderer.
- **Docs with code.** A feature ships with its `docs/entities/*.md` update
  and block `README.md`s in the same PR.
- **No emoji in UI copy.** The design system's brand rule. (This doc and
  other agent-facing markdown are fine without emoji too — keep it clean.)
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.

### Common commands

```bash
npm run dev                 # local dev (site + /admin)
npm run lint                # eslint
npm run typecheck           # tsc --noEmit
npm run test                # vitest
npm run test:e2e            # playwright
npm run db:generate         # drizzle-kit generate (after schema changes)
npm run db:migrate          # drizzle-kit migrate
npm run db:studio           # drizzle-kit studio
npm run seed                # neutral starter content (local only)
npm run seed:reset          # wipe + migrate + seed (local dev)
npm run seed:sample -- tech # industry sample: tech | artist | services | nonprofit
npm run check:white-label   # CI grep gate
```

### PR gate — all four must pass before a PR

```bash
npm run lint && npm run typecheck && npm run test -- --run
npm run check:white-label
```

### Deeper docs

Start at [docs/README.md](docs/README.md):

- [Getting started](docs/getting-started.md) · [Deployment](docs/deployment.md) · [Configuration](docs/configuration.md) · [FAQ](docs/faq.md)
- [Architecture](docs/architecture/) — blocks, entities, rendering & caching, auth, paywall, theming, adapters
- [Entities](docs/entities/) — one guide per content type, each with a "Fit it to your cause" section
- [Recipes](docs/recipes/) — add a block, add a content type, rebrand, swap the database, connect Stripe
- [Portability](docs/portability.md) — `lamina-theme@1`, `lamina-pack@1`, `lamina-site@1` formats

---

## Part 2 — Agent working agreement

These are the rules Devin follows in this repo, on top of the global rules in
`~/.claude/CLAUDE.md` and the always-on rules in `AGENTS.md`.

- **Plan before non-trivial code.** State assumptions, prefer the smallest
  safe change, and stop and ask when scope is ambiguous.
- **Match the surrounding code's style, types, and idioms.** Don't refactor
  unrelated code. If a file is under the 300-line cap, don't split it as part
  of an unrelated change.
- **Verify with the narrowest useful check before claiming done.** For a
  type-only change, `npm run typecheck`. For logic, add or run the relevant
  `vitest` test. For anything touching `src/` or `docs/`, run
  `npm run check:white-label`. The full PR gate is above.
- **Read the relevant Next.js guide first.** This is a custom Next.js build —
  check `node_modules/next/dist/docs/` before writing Next.js code, and heed
  deprecation notices.
- **Never put brand names, demo copy, or personal data in `src/` or `docs/`.**
  CI fails the build. Use `seed/neutral.ts` or `seed/demo-tanho.ts`.
- **Don't introduce new dependencies without checking the codebase first.**
  Look at neighboring files and `package.json`. When adding a dependency,
  prefer a version published at least 7 days ago, and run the package manager
  command (`npm install <pkg>`) rather than editing `package.json` by hand.
  Avoid floating ranges (`latest`, `*`, unbounded `>=`).
- **Don't bypass security or compliance controls** (branch protection,
  `minimumReleaseAge`, `.npmrc` security settings, the white-label grep gate,
  SSRF guards, the server-enforced paywall). If a control blocks you,
  escalate to the user instead of working around it.
- **Write tests for new utility functions and bug fixes.** Prefer a failing
  test that shows the bug, then the fix, then green.
- **Keep error handling proportional.** Handle errors at the right boundary;
  not every line needs a try/catch. Match the existing error-handling style.
- **Don't add or remove comments unless asked.** If you accidentally delete
  an existing comment, restore it.
- **Commit messages focus on "why" not "what".** Conventional commits
  (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`). Never commit secrets.
  Don't push unless asked.

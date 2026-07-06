# Swap the database to Postgres

The default is libSQL (Turso/file). The data layer is Drizzle, which speaks
Postgres, MySQL, and SQLite — but Drizzle has **no dialect-agnostic schema
API**: `sqliteTable`/`pgTable` and their column builders are separate
modules per dialect (`drizzle-orm/sqlite-core` vs `drizzle-orm/pg-core`).
Queries in `src/modules/*/queries.ts` and `actions.ts` survive a swap
unchanged (they only use the Drizzle query builder, never raw SQL) — but
every `src/modules/*/schema.ts` file needs converting, not just the client.

## Steps

1. **Create the app role.** Before running any migrations, create a
   dedicated, non-superuser Postgres role for the app to connect as —
   `postgres` (Supabase's default) owns the tables it creates, and table
   owners bypass Row-Level Security regardless of `FORCE ROW LEVEL
   SECURITY`, so connecting as `postgres` long-term defeats the RLS
   defense-in-depth added in step 6. Run once, via the Supabase SQL editor
   (or any Postgres client connected as `postgres`):

   ```sql
   CREATE ROLE oys_app WITH LOGIN NOINHERIT PASSWORD 'generate-a-real-one-here';
   ```

   `oys_app` is the fixed name the codemod's generated policies grant
   access to (step 2 below) — don't rename it without also updating the
   codemod, and don't reuse Supabase's reserved `anon`/`authenticated`/
   `authenticator`/`service_role` names.

2. **Run the codemod.** It converts every `src/modules/*/schema.ts` file
   per the column-type mapping below, AND rewrites `src/lib/db/client.ts`,
   `seed/lib.ts`, and `drizzle.config.ts` to the `node-postgres` driver —
   one command for the whole schema + client-file conversion:

   ```bash
   npx tsx scripts/swap-db-dialect.ts --dry-run   # preview
   npx tsx scripts/swap-db-dialect.ts              # apply
   ```

   It also fixes the small number of SQLite-only query terminators
   (`.get()` / `.all()`) that Postgres's async driver doesn't have, and
   adds `.enableRLS()` plus a `pgPolicy()` granting the `oys_app` role full
   access to every table (see "Row-Level Security" below). It's
   idempotent — safe to re-run, and it skips schema files that don't
   import `drizzle-orm/sqlite-core` (a few `schema.ts`/`*-schema.ts` files
   are plain zod schemas with no Drizzle table, e.g.
   `modules/marketplace/schema.ts`). If `client.ts`/`seed/lib.ts`/
   `drizzle.config.ts` have drifted from what the script expects, it warns
   instead of guessing — convert those by hand per the printed instructions.

3. **Install the driver**: `npm install pg` (and remove `@libsql/client` if
   you like).
4. **Regenerate migrations**: delete `drizzle/` and run
   `npm run db:generate` against the (now `postgresql`) dialect. This
   produces both the table DDL and (from the codemod's
   `.enableRLS()`/`pgPolicy()` additions) `ENABLE ROW LEVEL SECURITY` and
   `CREATE POLICY` statements — confirm both appear in the generated
   `drizzle/0000_*.sql` before proceeding, since `CREATE POLICY ... TO
   oys_app` will fail if step 1's role doesn't exist yet in the target
   database. Point `DATABASE_URL` at the `oys_app` role's connection
   string (not `postgres`'s) before running this.
5. **Add the FORCE RLS migration** — a `--custom` migration Drizzle can't
   generate on its own (it has no schema-level API for `FORCE ROW LEVEL
   SECURITY`, so this is the one hand-written step):

   ```bash
   npx drizzle-kit generate --custom --name enable-force-rls
   ```

   Replace the generated empty file's contents with
   [`scripts/postgres-rls-force.sql`](../../scripts/postgres-rls-force.sql) —
   it grants `oys_app` the table/sequence privileges matching its RLS
   policies and applies `FORCE ROW LEVEL SECURITY` to every table.
6. **Add the search migration** — another `--custom` migration, for the same
   reason as step 5: full-text search needs a `tsvector` generated column +
   GIN index, and Drizzle has no schema-level builder for either (the same
   reason FTS5's virtual table isn't Drizzle-managed on the default SQLite
   dialect — see `drizzle/0024_search_fts5.sql`):

   ```bash
   npx drizzle-kit generate --custom --name add-search-tsvector
   ```

   Replace the generated empty file's contents with
   [`scripts/postgres-search-tsvector.sql`](../../scripts/postgres-search-tsvector.sql) —
   it creates the `search_index` table (with a `search_vector` STORED
   generated column, title weighted above body), its GIN index, and the same
   RLS posture as every other table. `src/adapters/search/index.ts` already
   picks the Postgres-backed adapter
   (`src/adapters/search/postgres-tsvector.ts`) automatically once
   `DATABASE_URL` is a `postgres://`/`postgresql://` URL — nothing else to
   configure.
7. **Migrate, seed, and test**: `npm run db:migrate` (applies the table
   DDL/RLS migration, the FORCE RLS migration, and the search migration, in
   order), then `npm run seed` and run the app and the suite — connected as
   `oys_app` throughout, confirming RLS doesn't break legitimate app access.

## Column-type mapping (what the codemod does)

| SQLite (sqlite-core) | Postgres (pg-core) |
| --- | --- |
| `integer(col, { mode: "boolean" })` | `boolean(col)` |
| `text(col, { mode: "json" })` | `jsonb(col)` |
| bare `integer(col)` (unix-ms timestamps, counters) | `bigint(col, { mode: "number" })` |
| `real(col)` | `doublePrecision(col)` |
| `text(col, { enum: [...] })` | unchanged — pg-core supports this natively |
| `primaryKey`, `.notNull()`, `.default()`, `.unique()`, `.$defaultFn()`, `.$type<T>()` | unchanged, only the import source moves |

## Using Supabase specifically

Supabase's **direct connection** string
(`db.<project-ref>.supabase.co:5432`) is **IPv6-only**. If your network or
host can't route IPv6 (common on many ISPs, some CI runners, and some
corporate networks), `drizzle-kit migrate` will hang indefinitely trying to
resolve/connect — it fails silently, not with a clear error.

Use the **Session pooler** connection string instead (Supabase dashboard →
Project Settings → Database → Connection string → "Session pooler"). It's
IPv4-compatible and free — no add-on required. It looks like:

```
postgresql://postgres.<project-ref>:<password>@aws-<n>-<region>.pooler.supabase.com:5432/postgres
```

`drizzle-kit` commands (`db:generate`, `db:migrate`) read `.env`
automatically. Standalone `tsx` scripts (`npm run seed`, `seed:demo`,
`seed:sample`, `import`) do **not** get `.env` loaded by Next.js's runtime —
they're already wired with `--env-file-if-exists=.env` in `package.json` so
this isn't something you need to add yourself, but it's worth knowing why
`DATABASE_URL` "just works" for the dev server and needs no extra step for
these scripts either.

**Connecting as a role other than `postgres` through the pooler**: Supabase's
Supavisor pooler routes by a tenant-scoped username, not a bare role name —
even for the `oys_app` role from step 1, the connection string's username
must be `oys_app.<project-ref>`, not just `oys_app`:

```
postgresql://oys_app.<project-ref>:<password>@aws-<n>-<region>.pooler.supabase.com:5432/postgres
```

Using the bare role name against the pooler fails with a routing/tenant
error, not an auth error — if you see that, check the username format
first.

## Row-Level Security

Every table gets RLS enabled (`.enableRLS()`) and a single policy
(`<table>_app_only`) granting full access **only** to the `oys_app` role —
this is **defense-in-depth**, not this app's real authorization model. Every
feature's actual access control is `requireUser()` / `requireApiUser()` in
`src/modules/*/actions.ts` and API routes (see
[../architecture/auth.md](../architecture/auth.md)) — that's unchanged by
any of this. What RLS adds: if a Supabase API key (`anon`/`authenticated`)
or a stray `DATABASE_URL` pointed at a different role ever leaks separately
from your real credentials, it can't read or write your tables via
PostgREST or the SQL editor. Verified directly against a live Supabase
project: a session with `SET ROLE anon` reads **zero rows** from a
FORCE-RLS-locked table that a session connected as `oys_app` reads
correctly.

**What this does *not* protect against, by Postgres/Supabase design — not a
gap in this migration:** Supabase's own `postgres` and `service_role` roles
carry the `BYPASSRLS` attribute (`SELECT rolname, rolbypassrls FROM
pg_roles`), and `FORCE ROW LEVEL SECURITY` has no effect on a role with
`BYPASSRLS` — that's standard Postgres behavior. Both are meant to be
full-trust, admin-equivalent credentials (holding either is already
equivalent to holding your database's `DATABASE_URL`), so this is expected,
not something to work around.

**Deferred, not forgotten:** real per-row policies (e.g. "editors see only
their own posts") and admin-panel-editable permissions gated behind 2FA/
biometric verification are explicitly out of scope here. This app's entire
access model is one shared server-side DB connection with no per-request
Postgres identity — real row-level policies would need the app to expose a
per-user/per-role Postgres identity per request (a significantly bigger
change than the single shared `Pool` this app uses today), and 2FA doesn't
exist anywhere in this app yet (`docs/architecture/auth.md` is
single-factor password only). Both are legitimate future features, just not
something this defense-in-depth pass attempts.

## What to watch for

- **`onConflictDoNothing`/upserts**: supported on both dialects, syntax
  generated by Drizzle — no change needed.
- **Booleans**: SQLite stores them as integers; Postgres has a real
  boolean. The codemod's `boolean(col)` mapping and Drizzle's driver both
  handle this; only worth a second look if you have raw comparisons
  against a boolean column outside the query builder (rare — see the
  "queries survive unchanged" note above).
- After conversion, `npm run typecheck` should be clean. If it isn't, the
  codemod's dry-run output tells you which schema files it actually
  touched — cross-check against the error locations.

## Content blocks (symbols, collections) are swap-clean

The symbol + collection/repeater blocks and their tables (`symbols`, plus the
`collection` content that lives in the existing `block_sets`/`entries` JSON) were
verified against this codemod: `swap-db-dialect.ts --dry-run` converts
`src/modules/blocks/schema.ts` (including the `symbols` table) correctly
(`block_tree` `text(mode:json)` → `jsonb`; `version`/timestamps bare `integer` →
`bigint`), and the new server actions/queries (`symbol-actions.ts`,
`symbol-queries.ts`, `collection/resolve.ts`) use ONLY the Drizzle query builder —
no raw `sql\`…\``, no `.get()`/`.all()`, no SQLite-only functions — so they survive
the swap with zero special handling.

For MongoDB (a different question entirely — Drizzle is SQL-only), see
[mongodb-support-analysis.md](mongodb-support-analysis.md): it is a data-layer
re-architecture, not a dialect swap, and is out of scope here.

## The same pattern applies to storage, email, payments

Those are adapter interfaces too — swap the impl behind the interface, wire
it in the surface's `index.ts`, done. See
[../architecture/adapters.md](../architecture/adapters.md).

# MongoDB support — what would need to be created/converted

**Status: analysis only. No MongoDB code exists or is planned in this change.**

This document scopes what adding MongoDB as a primary-database option would take,
so the effort is understood before it's committed to. The short version: unlike the
Postgres swap (a one-command codemod — see `swap-database-to-postgres.md`), MongoDB
is **not a dialect swap**. It is a **data-layer re-architecture**, because the ORM
this codebase is built on (Drizzle) is SQL-only and has no MongoDB support at all.

## Why Postgres is easy and Mongo is not

The Postgres path works because Drizzle *is* a SQL query builder that speaks
SQLite, Postgres, and MySQL. Swapping dialects keeps the same programming model
(`db.query.x.findFirst(...)`, `db.insert(x).values(...)`, `sql\`...\``) — only the
schema column types and the driver change, which the codemod (`scripts/swap-db-dialect.ts`)
handles mechanically.

MongoDB breaks every one of those assumptions:
- **No Drizzle support.** There is no `mongoTable`, no Mongo dialect. The entire
  `db.*` API disappears.
- **No SQL.** Joins, `sql\`...\`` fragments, `GROUP BY`, aggregate functions, FTS —
  none translate directly; Mongo uses find/aggregation-pipeline documents.
- **Documents, not rows + relations.** The relational shape (foreign keys, join
  tables like `block_sets` keyed by `ownerType`/`ownerId`, `content_tags`) maps to
  Mongo very differently (embed vs. reference is a modelling decision per table).

## Scale of the change (measured, this codebase)

| Surface | Count | Mongo impact |
|---|---|---|
| Files importing `@/lib/db/client` | 169 | every one calls a SQL `db.*` API that Mongo lacks |
| `db.query.*` read sites | 304 | rewrite to a repository method / Mongo `find`/`aggregate` |
| `db.insert/update/delete` sites | 129 | rewrite to repository writes / Mongo `insertOne`/`updateOne`/`deleteOne` |
| `sql\`…\`` raw fragments | 52 | no Mongo equivalent — re-express each as an aggregation stage or app-side logic |
| Drizzle schema tables | 53 | each becomes a Mongo collection + a hand-written document shape + indexes |
| `db.transaction(...)` | 6 | Mongo multi-doc txns need a replica set; single-node dev Mongo can't run them |
| Migration files (`drizzle/`) | ~32 SQL | irrelevant; Mongo is schemaless — replaced by index-creation scripts |

## What must be CREATED

1. **A repository abstraction (the core new layer).** Every data access must go
   through an interface instead of `db.*` directly — e.g. `repos.entries.findBySlug`,
   `repos.entries.listPublished`, `repos.blockSets.upsert`. Two implementations:
   a SQL repo (wrapping today's Drizzle calls, so SQLite/Postgres keep working) and a
   Mongo repo (using the official `mongodb` driver). This is the bulk of the work:
   **~300 read + ~130 write call sites** must be moved behind ~30–40 repository
   modules (roughly one per module's `queries.ts`/`actions.ts`).
2. **A Mongo client factory** (`src/lib/db/mongo-client.ts`) selected off
   `DATABASE_URL` scheme (`mongodb:`/`mongodb+srv:`) — mirroring how
   `src/modules/content-schema/dialect.ts` and `src/adapters/search/index.ts`
   already branch on the URL scheme.
3. **Document shapes + an embed-vs-reference decision per table** (53 tables).
   Notably: `block_sets` (page trees by owner) → a `blocks` collection keyed on
   `{ownerType, ownerId, variant}`; `entries.data` (already JSON) → a natural
   document; join tables (`content_tags`, `entry_collections`) → embedded arrays or
   a references collection.
4. **A Mongo FTS adapter** (`src/adapters/search/mongo-atlas.ts`) — a third sibling
   to `fts5.ts` / `postgres-tsvector.ts`, using Mongo Atlas Search or a `$text`
   index. The search adapter's URL-scheme selection already accommodates a third arm.
5. **Index-creation scripts** replacing SQL migrations (unique indexes like
   `entries_type_slug_idx`, `symbols.id`, etc. become `createIndex` calls).
6. **The content-schema runtime DDL** (`src/modules/content-schema/ddl.ts`, today
   emitting `CREATE TABLE` per custom type) → a Mongo path that creates a collection
   + indexes per custom type instead of a table.

## What must be CONVERTED

- **The 52 `sql\`…\`` raw fragments** — re-expressed as aggregation stages or moved
  app-side. The sharpest ones: `analytics/queries.ts` (`date(…, 'unixepoch')`,
  `coalesce`, date grouping → Mongo `$dateToString`/`$group`), `commerce/stripe-events.ts`
  (`max(0, inventory - qty)` → `$max`/`$subtract`), `content-schema` introspection
  and `LIKE … ESCAPE` path queries.
- **The 6 `db.transaction` sites** — Mongo multi-document transactions require a
  replica set (not available on a single-node local Mongo), so each must either use
  a replica-set-backed deployment or be redesigned to be single-document-atomic.
- **RLS (Row-Level Security)** — the Postgres defense-in-depth (`pgPolicy`,
  `FORCE ROW LEVEL SECURITY`) has no Mongo equivalent; access control would move
  entirely into the repository layer / app, or Atlas's rules.
- **`.returning()` (69 sites)** — Mongo returns the written doc differently
  (`findOneAndUpdate` with `returnDocument`), handled inside the repo methods.

## Effort estimate

A **multi-week, multi-PR project** — comparable to a framework migration, not a
config change. The dominant cost is introducing and routing every one of the ~430
data-access call sites through a repository layer (which is also the prerequisite:
Mongo can't be bolted on without it). Realistic phasing:
1. Introduce the repository interface + SQL implementation (no behaviour change;
   just move `db.*` calls behind repos). This alone is large but safe and testable.
2. Add the Mongo client factory + Mongo repo implementation, module by module.
3. Mongo search adapter + per-custom-type collection DDL.
4. Transaction/RLS redesign + Atlas index scripts + end-to-end testing.

## Recommendation

The supported primary databases should stay **SQLite (default) + Postgres/Supabase**
— the set the codebase already models (`Dialect = "sqlite" | "postgres"`) and ships a
working swap for. MongoDB is worth doing only if there's a concrete requirement for
it, and if so it should be planned as its own project starting with step 1 (the
repository layer), which is valuable on its own and unblocks any future non-SQL store.

The content-block system added in this change (symbols, collection/repeater) is
**already Mongo-portability-friendly**: it uses only the Drizzle query builder (no
raw SQL), and its two tables (`symbols`, and the `collection` content living in the
existing `block_sets`/`entries` JSON) map cleanly to documents. So nothing in the
content-block work makes a future Mongo effort harder.

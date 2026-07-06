# Importer fixtures

Realistic, format-accurate sample exports for every content importer — one per
platform, each a multi-item export using that platform's **real** export
structure and block markup (not a one-line snippet). They serve two purposes:

1. **Round-trip tests** — [`fixtures-roundtrip.test.ts`](./fixtures-roundtrip.test.ts)
   runs each fixture through its importer's `dryRun` and asserts the counts plus
   that deliberately-malformed items surface as parse issues (graceful
   degradation), not silent drops.
2. **Downloadable exports** — the files in [`files/`](./files) are real export
   files you can upload through the live Import hub
   (`/admin/content/import/<id>`) to exercise the whole UI → preview → commit
   flow by hand.

## The builders

| File | Produces | Real export it mimics |
|---|---|---|
| [`ghost.ts`](./ghost.ts) | `{db:[{meta,data}]}` JSON + members CSV | Ghost → Settings → Migration → Export |
| [`wordpress.ts`](./wordpress.ts) | WXR 1.2 XML (Gutenberg blocks) | WordPress → Tools → Export → All content |
| [`squarespace.ts`](./squarespace.ts) | WXR XML (SQSP `sqs-block` bodies) | Squarespace → Settings → Import & Export → Export → WordPress |
| [`substack.ts`](./substack.ts) | `.zip` — `posts/<id>.<slug>.html` + `posts.csv` + `email_list.csv` | Substack → Settings → Exports |
| [`medium.ts`](./medium.ts) | `.zip` — `posts/*.html` (`p-name`/`data-field=body`/`p-canonical`) | Medium → Settings → Download your information |
| [`rss.ts`](./rss.ts) | RSS 2.0 XML + Atom XML | Any blog feed (`/rss.xml`, `/atom.xml`) |
| [`markdown-zip.ts`](./markdown-zip.ts) | `.zip` of `*.md` with YAML frontmatter | Jekyll `_posts/` · Hugo `content/` · Obsidian vault |

Each fixture intentionally includes the platform's native cards (image,
gallery, embed, button, code block where the platform supports them), drafts vs
published, tags/categories, redirects/aliases/canonicals, and **one broken item**
(missing slug, empty item, or invalid YAML) to prove the importer records an
issue and keeps going.

## Regenerating the downloadable files

The `files/` artifacts are committed, but if you edit a builder, refresh them:

```bash
npx tsx src/modules/importers/__fixtures__/write-files.ts
```

## Fidelity note

These are **faithful reconstructions** of each format from its public export
spec + the importer's own parse contract — not captures from live accounts. They
cover the shapes the parsers target; a real 500-post export may still carry
long-tail quirks (Ghost lexical/mobiledoc JSON bodies, WordPress serialized-PHP
shortcodes, Substack podcast post types) these don't. Drop a real export into
`files/` and point a round-trip test at it when you want to harden against those.

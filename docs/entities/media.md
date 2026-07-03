# Media

The site-wide asset store — every image, video, and document, with alt
text, tags, and full attribution/licensing records, plus a live map of
where each asset is used.

## Data model

| Field | Notes |
| --- | --- |
| `storageKey` | Server-generated (`<cuid>.<ext>`) — never user-controlled |
| `name` | Original filename, display only |
| `kind` | `image \| video \| doc` (derived from MIME) |
| `mime`, `size`, `w`, `h` | Upload metadata (`w`/`h` nullable) |
| `alt` | Accessibility text — the library flags assets missing it |
| `tags` | Free-form organization + filtering |
| `credit`, `source`, `sourceUrl` | Attribution |
| `license` | `original / client / purchased / cc0 / unsplash / pexels / cc-by / cc-by-sa / unknown` |

Licenses carry a **credit-required** flag (Unsplash, Pexels, CC BY, CC
BY-SA, unknown). An asset with such a license and no credit shows a
"Credit needed" badge, and the library's compliance filters surface all of
them in one click.

`media_usage` records where each asset appears (page/post/product…, plus
which block). It's rebuilt from the published block tree on every publish
— so "Used in" always reflects what's live, and deleting an asset warns
you about the exact places it would break.

## Storage & serving

Files live behind a `StorageAdapter` (`src/adapters/`); the default writes
to `data/uploads/` on local disk. Assets serve from `/api/media/<key>`
with immutable caching. Uploads are validated three ways: extension/MIME
allowlist (no SVG), a 15MB cap, and magic-byte signature checks.

## Fit it to your cause

- Add an accepted file type: extend the allowlist + signature map in
  `modules/media/{validation,signature}.ts`.
- Swap to S3/R2: implement `StorageAdapter` (four methods) and register it
  in `src/adapters/storage/index.ts` — see
  [../architecture/adapters.md](../architecture/adapters.md).
- Repurpose the license catalog (e.g. for a photo archive with rights
  windows): the catalog lives in `modules/media/licenses.ts`; add entries
  and the credit rules follow.

## FAQ

**Why no SVG uploads?** SVG can carry scripts — an XSS vector when served
from your origin. Use the logo/favicon slots (processed separately) or
convert to PNG.

**Why is "Used in" empty for an asset I just placed?** Usage tracks the
*published* tree. Publish the page and it appears.

**Where do uploads go in production?** Local disk by default — fine for a
single server; deploy on Vercel or multi-node setups needs an
S3-compatible adapter (see above).

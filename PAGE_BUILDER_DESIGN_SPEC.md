# Page Builder — Design Spec

**For:** Claude Design
**Scope:** Visual design for the admin Page Builder surface — a generic, block-based editor for composing any page (starting with the homepage) from a shared block registry, with a live split-pane preview.
**Codebase:** Next.js 16 App Router portfolio CMS, single admin user, no multi-tenancy. Design-token CSS variables already exist (see §7) — reuse them, don't invent a new palette.

---

## 1. What already exists vs. what needs designing

This matters because half the plumbing is built and shouldn't be redesigned — only the **generic page-builder admin UI** is net-new.

**Already built and shipped (do not redesign):**
- A block-type registry (`text`, `image`, `video`, `metric`, `gallery`) with editor + renderer components per type
- A block-tree editor component (`PageBuilder`) — currently only wired into the project-editing form, for "case study blocks" on a single project
- A block-tree renderer component (`BlockTree`) — used on the public project page
- A live split-pane preview (iframe + postMessage) — currently only wired into the project editor
- A `pages` database table (slug, title, route, status, SEO fields) — exists, has zero rows, no admin UI writes to it yet
- `content/pages/<slug>.json` file storage for a page's block tree — exists, currently only `home.json`, hand-authored, no admin UI reads/writes it
- A homepage-specific block registry (6 "data-bound" types: `profile-header`, `project-list`, `experience-list`, `skills-list`, `award-list`, `education-list`) that render live data rather than carrying inline content

**Needs designing (this is the actual ask):**
- An admin **Pages** list view (new — there is no route for this today)
- A generic **page editor** screen: block-tree builder + live preview, for any page row, not just the one project-blocks case
- The **block picker / add-block** interaction, generalized beyond the current 5-button row
- A **block reorder** interaction (drag-and-drop does not exist yet — blocks can only be added at the end or removed)
- The **SEO fields panel** pattern, generalized from the one that exists today only inside the project form
- Empty/first-run states (an empty page, a page with zero blocks, the "no pages exist yet" list state)

---

## 2. Users & context

- Single admin user (no roles, no permissions, no multi-user editing/locking to design for)
- Desktop-first admin (screens ≥ 1024px is the real usage pattern; mobile admin is out of scope)
- Editor is authenticated-only; never seen by public site visitors
- The admin is also the site's sole content author — optimize for a fast, confident solo workflow, not for onboarding a stranger

---

## 3. Information architecture

```
/admin                          existing dashboard, lists Projects/Experience/Skills/Awards/Education
  └── /admin/pages              NEW — list of Page rows (slug, title, route, status)
        └── /admin/pages/new    NEW — create a Page row
        └── /admin/pages/[id]   NEW — edit a Page: structured fields + block builder + SEO + live preview
```

The **Pages** admin section is a sibling to the existing five entity sections on `/admin`, following the exact same list-row pattern already on that dashboard (title/status/edit-link row, "+ New" button top-right of the section). Don't invent a new list pattern — match:

- Section header: small-caps mono label + "+ New" outline button, right-aligned
- Row: flex row, title + status badge on the left, "Edit →" text link on the right, hairline border-top between rows (see the existing `/admin` dashboard for the exact spacing/typography — `AdminPageShell` + inline row pattern)

## 4. Data model (for accurate field mapping — do not invent fields)

```ts
interface Page {
  id: string;
  slug: string;            // URL-safe, unique, drives content/pages/<slug>.json path
  title: string;
  route: string;           // e.g. "/" for home — informational today, not yet used for dynamic routing
  status: "draft" | "published";
  sortOrder: number;
  seoTitle: string | null;        // falls back to `title`
  seoDescription: string | null;  // falls back to nothing (Page has no tagline field)
  ogImage: string | null;         // no fallback (Page has no coverImage field)
  canonicalUrl: string | null;
  noIndex: number;                // 0 or 1, checkbox in UI
  createdAt: string;
  updatedAt: string;
}

type BlockType = "text" | "image" | "video" | "metric" | "gallery";

interface Block {
  type: BlockType;
  content: Record<string, unknown>;  // shape depends on type, see §5
  sortOrder: number;
}
```

A Page row's block tree is **not** a DB column — it's the array in `content/pages/<slug>.json`. The page editor screen loads/saves the `Page` row (structured fields, SEO) and the block-tree JSON as two logically separate save operations, exactly like the existing project editor separates "structured fields," "description" (file-backed), and "case study blocks" (also file-backed) into independent save actions with independent save buttons. **Preserve that separation in the design — don't collapse it into one giant "Save" button**, since the existing pattern deliberately keeps file writes (which hit an API round-trip, and in production go through a GitHub-commit + rebuild cycle) decoupled from fast DB field saves.

## 5. The 5 block types (content-carrying)

Each has a distinct editor form and a distinct rendered output. Design the **editor card** for each (what the admin sees inside the block-tree builder) — the rendered/public output is already designed (existing site), just reference it for fidelity.

| Type | Editor fields | Rendered output (reference) |
|---|---|---|
| `text` | One large HTML textarea (monospace font) | Rendered prose block |
| `image` | File upload input, "or paste URL" text input, caption text input, thumbnail preview above the inputs | 16:9 image with optional caption below |
| `video` | File upload input, "or paste URL," caption input, poster-image-URL input, inline `<video>` preview | Video player with optional caption |
| `metric` | Repeatable rows: value input + label input + remove (×) button per row, "+ Add metric" button | Grid of large-number/label tiles (2 or 3 columns depending on count) |
| `gallery` | Multi-file upload, grid of thumbnails each with a remove (×) overlay button | 2-column image grid with per-image captions |

Every block editor card (regardless of type) has this shared shell — **design this shell once, reuse for all 5**:
- Small-caps mono label showing the block type name, top-left
- "Remove" text-button, top-right, same row
- Type-specific form fields below
- Bordered container, consistent padding, consistent corner radius (see §7 tokens)

## 6. Core interactions to design

### 6.1 Add block
Current implementation: a horizontal row of outline buttons at the bottom of the block list, one per type (`+ text`, `+ image`, `+ video`, `+ metric`, `+ gallery`), clicking appends a new block at the end with sensible empty defaults.

**Design ask:** this scales fine at 5 types but should be designed to tolerate more types being added later without becoming an unbounded button row — consider whether a dropdown/menu trigger ("+ Add block ▾") replaces the button row once type count grows, and design both the current 5-button state and that future menu state. Don't block on this — ship the simpler pattern if the button row still reads cleanly, but the menu variant should exist as a documented alternative.

### 6.2 Reorder blocks (net-new — does not exist today)
Blocks currently only support add-at-end and remove; there is no reorder UI at all. Design a reorder interaction — drag handle per block card is the most likely fit given the vertical card-stack layout already established. Needs:
- A visible drag handle (left edge of each block card, likely a simple grip icon)
- Drag-in-progress state (elevated shadow, insertion-point indicator between cards)
- Keyboard-accessible alternative (up/down move buttons) — this admin is a single power user who may prefer keyboard over drag

### 6.3 Live preview (already built — design the container, not the mechanism)
The mechanism (iframe + postMessage, instant update on every keystroke, no save required) is implemented and works — reference `ProjectEditorWithPreview` for the current split-pane layout:
- Two-column grid, editor left / preview right, roughly equal width
- Preview column has a small-caps "Live preview" label above it
- Preview `<iframe>` is bordered, rounded corners, sticky-positioned so it stays in view while the (potentially long) editor column scrolls
- Preview height is a fixed viewport-relative value (currently `80vh`)

**Design ask:** this pattern needs to generalize from "always shows one specific project" to "shows whatever page is being edited." Also design the **responsive collapse**: below some width, does the preview stack below the editor, become a toggleable drawer, or disappear behind a "Preview" button that opens a modal/new tab? Desktop-first, but don't leave sub-1024px totally undefined.

### 6.4 SEO panel (already built for projects — generalize the pattern)
Current implementation is a native `<details>/<summary>` disclosure, collapsed by default, containing: SEO title, SEO description (textarea), OG image (URL input), canonical URL (URL input), and a noindex checkbox. Each labeled field shows its fallback behavior as hint text (e.g. "Falls back to Title when blank").

**Design ask:** same pattern, same 5 fields, applied to the generic Page editor — note Page has no `tagline`/`coverImage` to fall back to (see §4), so the hint text differs slightly ("SEO description" has no fallback source to mention).

### 6.5 Empty states
- **Pages list, zero rows:** first-run state, needs a clear "+ New page" call to action and brief explanatory copy (no existing empty-state copy to match — establish the voice: terse, direct, matches the rest of the admin's plain-spoken tone, e.g. "No projects yet." is the existing pattern for other empty lists — one short sentence, no exclamation marks, no illustration)
- **Page editor, zero blocks:** the block-tree area before any block is added — should not look broken, should visually invite the first "+ add block" action
- **Draft vs. published page in preview:** should the preview pane show any different treatment (banner, watermark) when previewing a draft page vs. published? Design an opinion here — there's no existing pattern to match since the current preview is always for a real, identifiable project.

## 7. Design tokens — reuse, do not redefine

The whole app runs on CSS custom properties, no Tailwind utility classes in practice (Tailwind is installed but essentially unused beyond one import). Every dimension, color, and type size in the design should map to one of these existing tokens — treat this as the constraint, not a suggestion:

```css
/* Color */
--bg: #fdfcf9;              --surface: #f6f4ee;           --surface-hover: #efece2;
--text: #1c1a16;            --text-muted: #57534a;        --text-faint: #8c877b;
--border: #e6e2d7;          --border-strong: #d8d3c5;
--accent: #6e2b32;          /* maroon — primary accent */ --accent-hover: #45191e;
--accent-2: #585c34;        /* olive — secondary accent */
--danger: #913a43;          --success: #585c34;

/* Type */
--font-sans: Geist, system-ui, sans-serif;      /* body/UI */
--font-mono: Geist Mono, ui-monospace, monospace; /* labels, small-caps eyebrows, mono data */
--text-display: 2.25rem;  --text-h1: 1.875rem;  --text-h2: 1.25rem;
--text-body: 1rem;         --text-sm: 0.875rem;  --text-xs: 0.75rem;  --text-2xs: 0.6875rem;

/* Spacing scale (4px base) */
--space-1 … --space-12   /* consistent 4px-based scale already in use throughout */

/* Radius */
--radius-sm; --radius-xs; --radius-pill
```

Recurring visual patterns already established, to match exactly:
- **Eyebrow labels**: `font-mono`, `text-2xs`, uppercase, wide letter-spacing, `text-muted` color — used for every section header and field label in the admin
- **Bordered cards**: 1px `--border`, `--radius-sm`, generous internal padding (`--space-4`)
- **Buttons**: solid/outline/ghost variants already exist as a shared `Button` component (`src/components/ui/Button.tsx`) — reuse, don't design new button styles
- **Status badges**: existing `Badge` component with `published`/`draft` variants (maroon-tinted vs. neutral) — reuse for the Pages list status column

## 8. Explicit non-goals for this design pass

- Multi-page-type routing (the `route` field exists but nothing resolves it dynamically yet — don't design a URL-routing configuration UI)
- Multi-user permissions, comments, or approval workflows
- Version history / undo beyond the browser's native form undo
- Mobile admin layout
- New block types beyond the existing 5 (design the *pattern* for adding one — the shared card shell in §5 — not any specific new type)

## 9. Deliverable format

Screens needed, each at desktop width (1280–1440px reference frame):
1. `/admin/pages` — list view, populated + empty state
2. `/admin/pages/new` — create form (structured fields only, no block builder yet since there's no id to attach content to — mirror how "new project" today shows a message instead of the description/blocks sections until first save)
3. `/admin/pages/[id]` — full editor: structured fields, block-tree builder (populated with 2–3 example blocks including at least one of each visual weight — text, an image-having type, metric), SEO panel (both collapsed and expanded), live preview pane
4. Block editor card — all 5 types, each as its own component spec
5. Reorder interaction — drag state + keyboard-alternative affordance
6. Responsive breakpoint for the split-pane preview (collapse/stack/toggle — pick one, document the choice)

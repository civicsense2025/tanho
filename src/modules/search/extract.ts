import { isContainer, kidsOf } from "@/blocks/tree";
import type { BlockNode, RenderViewer } from "@/blocks/types";
import { visibleBlocksFor } from "@/blocks/paywall/gate";
import sanitizeHtml from "sanitize-html";
import { marked } from "marked";

/**
 * Block-tree → plain text, for search indexing. Walks ONLY
 * `visibleBlocksFor(null, blocks)` — the anonymous-viewer cut — never the raw
 * tree, so gated prose behind a paywall is never written into the search
 * index as matchable text. This mirrors why the TOC/breadcrumbs/outline
 * builders (see pages/outline.ts) all read the same pure mirror instead of
 * the full tree: anything DERIVED from a page for public consumption must
 * respect the same cut the renderer itself enforces (gating.test.tsx's
 * nested-wall invariant applies here exactly as it does to those).
 *
 * Passing `null` (never a real RenderViewer) is deliberate: the index is one
 * shared artifact reused by every future request, not resolved per-visitor —
 * so it must contain the STRICTEST (anonymous) cut, the maximum-safe-to-cache
 * subset of a page's text. A signed-in member's broader access is handled at
 * QUERY time by re-resolving the document's stored `gate` (see
 * adapters/types.ts's SearchDocument doc comment) against the real viewer,
 * never by indexing more text than an anonymous visitor could see.
 */
const ANONYMOUS: RenderViewer = null;

/** Types whose content is structural/navigational, not reader-facing prose —
 *  deliberately excluded so search results surface real content, not button
 *  labels, form ids, or chrome copy. Revisit if a new block type's primary
 *  purpose is genuinely prose (unlike a button/menu/logo's short UI string). */
const SKIP_TYPES = new Set([
  // layout/structural — no own text, only children (children are still walked)
  "section", "container", "row", "columns", "spacer", "divider",
  // navigation/chrome — labels and menu refs, not prose
  "nav-menu", "logo", "cta-button", "footer-column", "social-links",
  "site-header", "site-footer", "breadcrumbs", "table-of-contents",
  "jump-to-top", "reading-progress", "announcement",
  // commerce UI cards — short promo labels, not article prose
  "product", "productgrid", "pricing", "checkout", "donation", "booking",
  // interactive/embeds/media captions-only/forms/code/data-bound
  "form", "embed", "video", "carousel", "gallery", "chart", "image",
  "postlist", "related-content", "account", "paywall", "newsletter",
  // profile/entity summary cards — their own entity row is the real source
  "profile-header", "project-list", "experience-list", "skills-list",
  "award-list", "education-list",
]);

/** marked+sanitize-html strip to plain text (empty allowlist keeps only text
 *  nodes, decoding entities) — reuses the same two already-audited
 *  dependencies richtext rendering uses (lib/sanitize.ts), rather than a
 *  hand-rolled regex stripper that mishandles nesting/entities/comments. */
function toPlainText(html: string): string {
  return sanitizeHtml(html ?? "", { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}

function markdownToPlainText(md: string): string {
  if (!md) return "";
  const html = marked.parse(md, { async: false }) as string;
  return toPlainText(html);
}

/** Extract one block's own text (not children's — callers walk children separately). */
function ownText(b: BlockNode): string {
  const c = b.content as Record<string, unknown>;
  switch (b.type) {
    case "heading":
      return typeof c.text === "string" ? c.text : "";
    case "richtext": {
      // html wins when both are set — same precedence richtext's own Render uses.
      if (typeof c.html === "string" && c.html) return toPlainText(c.html);
      return typeof c.md === "string" ? markdownToPlainText(c.md) : "";
    }
    case "quote": {
      const text = typeof c.text === "string" ? c.text : "";
      const cite = typeof c.cite === "string" ? c.cite : "";
      return [text, cite].filter(Boolean).join(" — ");
    }
    case "callout": {
      const title = typeof c.title === "string" ? c.title : "";
      const body = typeof c.body === "string" ? c.body : "";
      return [title, body].filter(Boolean).join(". ");
    }
    case "list": {
      const items = Array.isArray(c.items) ? (c.items as unknown[]) : [];
      return items.filter((i): i is string => typeof i === "string").join(". ");
    }
    case "accordion": {
      const items = Array.isArray(c.items) ? (c.items as Array<{ q?: unknown; a?: unknown }>) : [];
      return items
        .map((i) => [typeof i.q === "string" ? i.q : "", typeof i.a === "string" ? i.a : ""].filter(Boolean).join(". "))
        .filter(Boolean)
        .join(" ");
    }
    case "metric": {
      const items = Array.isArray(c.items) ? (c.items as Array<{ value?: unknown; label?: unknown }>) : [];
      return items
        .map((i) => (typeof i.label === "string" ? i.label : ""))
        .filter(Boolean)
        .join(", ");
    }
    case "timeline": {
      const items = Array.isArray(c.items) ? (c.items as Array<{ date?: unknown; title?: unknown; note?: unknown }>) : [];
      return items
        .map((i) =>
          [typeof i.title === "string" ? i.title : "", typeof i.note === "string" ? i.note : ""]
            .filter(Boolean)
            .join(". "),
        )
        .filter(Boolean)
        .join(" ");
    }
    case "table": {
      const columns = Array.isArray(c.columns) ? (c.columns as unknown[]) : [];
      const rows = Array.isArray(c.rows) ? (c.rows as unknown[][]) : [];
      const colText = columns.filter((v): v is string => typeof v === "string").join(" ");
      const rowText = rows
        .map((row) => (Array.isArray(row) ? row.filter((v): v is string => typeof v === "string").join(" ") : ""))
        .join(" ");
      return [colText, rowText].filter(Boolean).join(" ");
    }
    case "buttons": {
      // Button labels are UI, not prose — deliberately not indexed (matches
      // SKIP_TYPES's cta-button/nav-menu precedent); only listed here because
      // `buttons` also nests no children, so there's nothing else to walk.
      return "";
    }
    case "code":
      // Filename only — source code itself isn't matchable prose, and
      // indexing it would make every search for a common word a code hit.
      return typeof c.filename === "string" ? c.filename : "";
    default:
      return "";
  }
}

/**
 * Depth-first walk producing one flat string for a block tree. Each block's
 * own text is followed by its children's (document order), single-space
 * joined. Blocks in SKIP_TYPES contribute no text of their own but their
 * children ARE still walked (e.g. a `section` wrapping a `richtext`).
 */
export function indexBlockTree(blocks: BlockNode[]): string {
  const parts: string[] = [];
  const walk = (nodes: BlockNode[]) => {
    for (const b of nodes) {
      if (!SKIP_TYPES.has(b.type)) {
        const text = ownText(b);
        if (text) parts.push(text);
      }
      if (isContainer(b)) walk(kidsOf(b));
    }
  };
  walk(visibleBlocksFor(ANONYMOUS, blocks));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

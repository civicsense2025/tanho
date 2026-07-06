/**
 * Block builders for sample packs — re-exported from the demo seed's helpers so
 * packs read declaratively (`heading(...)`, `rich(...)`, `list(...)`). These are
 * pure, brand-agnostic mechanics; only the CONTENT a pack passes in is
 * industry-specific.
 */
import { b, type Block } from "../../demo/demo-blocks";

export { b, rich, md, type Block } from "../../demo/demo-blocks";

export const heading = (text: string, level: "h1" | "h2" | "h3" = "h2"): Block =>
  b("heading", { text, level, align: "left" });

export const list = (items: string[], style: "bullet" | "check" | "number" = "check"): Block =>
  b("list", { style, items });

export const buttons = (
  items: Array<{ label: string; href: string; variant?: "solid" | "outline" }>,
): Block => b("buttons", { align: "left", items });

export const section = (blocks: Block[], background = "surface"): Block =>
  b("section", { width: "contained", background, py: "lg", blocks });

export const metric = (items: Array<{ value: string; label: string }>): Block =>
  b("metric", { cols: Math.min(items.length, 4), items });

/** A bound block that lists published projects (empty-safe). */
export const projectList = (): Block => b("project-list", {});

/** A bound block that lists published posts (empty-safe). */
export const postList = (): Block => b("postlist", {});

/** A pricing table. */
export const pricing = (
  tiers: Array<{ name: string; price: string; cadence?: string; features: string[]; cta?: string; href?: string; featured?: boolean }>,
): Block => b("pricing", { tiers });

// ── Richer vocabulary for the persona packs ────────────────────────────────
// Layout containers (their `blocks` is a child tree), plus the content/media
// atoms the design-system personas use. All pass content matching each block's
// own schema (see src/blocks/<type>/fields.ts).

/** A max-width content wrapper around a child block tree. */
export const container = (blocks: Block[], maxWidth: "content" | "prose" | "full" = "content"): Block =>
  b("container", { maxWidth, blocks });

/** A responsive column layout holding a child block tree. */
export const columns = (blocks: Block[], cols = 2, stackAt: "mobile" | "tablet" = "mobile"): Block =>
  b("columns", { cols, stackAt, blocks });

/** A code / terminal block. `language: "sh"` reads like a terminal transcript. */
export const code = (codeText: string, opts: { filename?: string; language?: string } = {}): Block =>
  b("code", { code: codeText, filename: opts.filename ?? "", language: opts.language ?? "ts" });

/** A hairline (or dotted) divider. */
export const divider = (style: "line" | "dotted" = "line"): Block => b("divider", { style });

/** A block quote with optional attribution. */
export const quote = (text: string, cite = ""): Block => b("quote", { text, cite });

/** A large statement / manifesto line. */
export const statement = (text: string, opts: { cite?: string; align?: "left" | "center"; size?: "lg" | "xl" } = {}): Block =>
  b("statement", { text, cite: opts.cite ?? "", align: opts.align ?? "center", size: opts.size ?? "xl" });

/** A vertical timeline of dated milestones. */
export const timeline = (items: Array<{ date: string; title: string; note?: string }>): Block =>
  b("timeline", { items: items.map((i) => ({ date: i.date, title: i.title, note: i.note ?? "" })) });

/** Testimonials with a view option (grid / carousel / single). */
export const testimonial = (
  items: Array<{ quote: string; name: string; role?: string; avatar?: string; rating?: number }>,
  opts: { layout?: "grid" | "carousel" | "single"; cols?: number } = {},
): Block =>
  b("testimonial", {
    layout: opts.layout ?? "grid",
    cols: opts.cols ?? Math.min(items.length, 3),
    items: items.map((i) => ({ quote: i.quote, name: i.name, role: i.role ?? "", avatar: i.avatar ?? "", rating: i.rating ?? 0 })),
  });

/** An FAQ list (emits FAQ structured data). */
export const faq = (items: Array<{ q: string; a: string }>): Block => b("faq", { items });

/** An opinion poll (no backend — vote persists in the browser). */
export const poll = (question: string, options: string[]): Block =>
  b("poll", { question, options: options.map((label) => ({ label, seed: 0 })) });

/** A newsletter signup block. */
export const newsletter = (opts: { title?: string; blurb?: string } = {}): Block =>
  b("newsletter", { ...(opts.title ? { title: opts.title } : {}), ...(opts.blurb ? { blurb: opts.blurb } : {}) });

/** A video block (poster + optional caption). */
export const video = (opts: { src?: string; poster?: string; caption?: string } = {}): Block =>
  b("video", { src: opts.src ?? "", poster: opts.poster ?? "", caption: opts.caption ?? "" });

/** An image block. */
export const image = (opts: { src?: string; alt?: string; caption?: string } = {}): Block =>
  b("image", { src: opts.src ?? "", alt: opts.alt ?? "Image", caption: opts.caption ?? "" });

/** A custom (donation / interactive-form) embed — url must be an allowlisted host. */
export const donateEmbed = (url: string, ratio: "16 / 9" | "4 / 3" | "1 / 1" | "21 / 9" = "4 / 3"): Block =>
  b("embed", { provider: "custom", url, ratio });

/**
 * A general collection/repeater: bind to a record source and repeat an item
 * template per record. `template` blocks may use `{{record.field}}` tokens.
 */
export const collection = (
  source: { kind: "entries"; entity: string } | { kind: "customType"; type: string },
  template: Block[],
  limit = 6,
): Block => b("collection", { source, limit, blocks: template });

/** A symbol instance — insert a saved reusable block by id (see the pack's symbols). */
export const symbol = (symbolId: string, label?: string): Block =>
  b("symbol", { symbolId, overrides: [], ...(label ? { _label: label } : {}) });

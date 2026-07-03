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

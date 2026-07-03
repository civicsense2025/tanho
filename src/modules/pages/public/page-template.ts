import type { PageLayoutSettings } from "@/blocks/layout";

/**
 * Page templates are a light intent layer over the existing layout knobs — NOT
 * a parallel renderer (that would risk editor/public drift). A template supplies
 * DEFAULT layout settings (max-width, gutter, spacing) that the page's own
 * explicit `layout` overrides field-by-field. `blank` is a no-op.
 *
 * This keeps one renderer (RenderBlocks) and one layout pipeline (pageLayout);
 * the template just seeds sensible defaults so an "article" reads narrow and a
 * "docs" page runs wide without the author setting every knob.
 */
export type PageTemplate = "blank" | "landing" | "article" | "shop" | "docs";

const TEMPLATE_DEFAULTS: Record<PageTemplate, PageLayoutSettings> = {
  blank: {},
  landing: { maxWidth: "wide", gutter: "normal", padY: "md" },
  article: { maxWidth: "narrow", gutter: "normal", padY: "lg" },
  shop: { maxWidth: "wide", gutter: "normal", padY: "md" },
  docs: { maxWidth: "wide", gutter: "wide", padY: "md" },
};

/**
 * Merge a template's defaults UNDER the page's explicit layout, so explicit
 * settings always win. The result feeds the existing `pageLayout()` helper.
 */
export function layoutForTemplate(
  template: string | undefined,
  layout: PageLayoutSettings,
): PageLayoutSettings {
  const defaults = TEMPLATE_DEFAULTS[(template ?? "blank") as PageTemplate] ?? {};
  return { ...defaults, ...layout };
}

/** True for templates that want prose-style reading measure/leading on text. */
export function isProseTemplate(template: string | undefined): boolean {
  return template === "article" || template === "docs";
}

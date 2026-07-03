/**
 * Footer layout recipes — the 14 preset arrangements. Recipes describe
 * which optional rows/cells render; the config supplies all content.
 * `cols` is the layout's menu-column budget (0 = none, 1 = narrow, 2 = up
 * to four). Read by public/FooterBar.tsx and the admin schematics.
 */

export const FOOTER_GROUPS = [
  "Minimal",
  "SaaS",
  "Marketing",
  "Ecommerce",
  "Enterprise",
  "Editorial",
  "Local & service",
] as const;
export type FooterGroup = (typeof FOOTER_GROUPS)[number];

export type FooterRecipe = {
  id: FooterLayoutId;
  label: string;
  group: FooterGroup;
  cols: 0 | 1 | 2;
  social?: boolean;
  centered?: boolean;
  bottomBar?: boolean;
  banner?: boolean;
  newsletter?: boolean;
  badges?: boolean;
  brandLeft?: boolean;
  dark?: boolean;
  legalRow?: boolean;
  splitBar?: boolean;
  big?: boolean;
  contact?: boolean;
  map?: boolean;
  contrast?: boolean;
};

export const FOOTER_LAYOUT_IDS = [
  "simple-centered",
  "multi-column",
  "cta-banner",
  "newsletter-forward",
  "mega-ecommerce",
  "two-column-brand",
  "sitemap-dense",
  "utility-minimal",
  "split-bar-thin",
  "statement-wordmark",
  "contact-forward",
  "legal-heavy",
  "map-location",
  "colored-block",
] as const;
export type FooterLayoutId = (typeof FOOTER_LAYOUT_IDS)[number];

const r = (
  id: FooterLayoutId,
  label: string,
  group: FooterGroup,
  cols: 0 | 1 | 2,
  flags: Partial<FooterRecipe> = {},
): FooterRecipe => ({ id, label, group, cols, ...flags });

export const FOOTER_RECIPES: Record<FooterLayoutId, FooterRecipe> = {
  "simple-centered": r("simple-centered", "Simple centered", "Minimal", 0, { social: true, centered: true }),
  "multi-column": r("multi-column", "Multi-column", "SaaS", 2, { social: true, bottomBar: true }),
  "cta-banner": r("cta-banner", "CTA banner", "Marketing", 2, { social: true, banner: true, bottomBar: true }),
  "newsletter-forward": r("newsletter-forward", "Newsletter forward", "Marketing", 1, { newsletter: true, social: true, bottomBar: true }),
  "mega-ecommerce": r("mega-ecommerce", "Mega ecommerce", "Ecommerce", 2, { newsletter: true, social: true, bottomBar: true, badges: true }),
  "two-column-brand": r("two-column-brand", "Two-column brand", "SaaS", 1, { social: true, bottomBar: true, brandLeft: true }),
  "sitemap-dense": r("sitemap-dense", "Sitemap dense", "Enterprise", 2, { bottomBar: true }),
  "utility-minimal": r("utility-minimal", "Utility minimal", "Minimal", 0, { bottomBar: true, dark: true, legalRow: true }),
  "split-bar-thin": r("split-bar-thin", "Split bar, thin", "Minimal", 0, { social: true, splitBar: true }),
  "statement-wordmark": r("statement-wordmark", "Statement wordmark", "Editorial", 1, { social: true, big: true, bottomBar: true }),
  "contact-forward": r("contact-forward", "Contact forward", "Local & service", 2, { social: true, bottomBar: true, contact: true }),
  "legal-heavy": r("legal-heavy", "Legal heavy", "Enterprise", 2, { bottomBar: true, legalRow: true }),
  "map-location": r("map-location", "Map + location", "Local & service", 1, { social: true, bottomBar: true, map: true }),
  "colored-block": r("colored-block", "Colored block", "Marketing", 2, { newsletter: true, social: true, bottomBar: true, contrast: true }),
};

/** Recipe lookup with a safe fallback (unknown ids render the default). */
export const footerRecipe = (id: string): FooterRecipe =>
  FOOTER_RECIPES[id as FooterLayoutId] ?? FOOTER_RECIPES["simple-centered"];

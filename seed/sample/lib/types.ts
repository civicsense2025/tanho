import type { Block } from "../../demo/demo-blocks";

/**
 * A SamplePack is DATA ONLY — a fully-described, brand-neutral demo site for one
 * industry. `applySamplePack` (apply.ts) turns it into a complete, explorable
 * install: every menu link resolves to a seeded page, every bound block has
 * data, and gated features (ecommerce/AI/paid) are left in their locked state so
 * they render "disabled until enabled".
 *
 * All brands here are FICTIONAL — never a real company, person, or PII.
 */

export type SamplePackMeta = {
  /** Industry key used on the CLI: `npm run seed:sample -- <key>`. */
  key: string;
  /** Fictional brand name shown as the site name. */
  brand: string;
  /** One-line tagline (site tagline / hero). */
  tagline: string;
  /** Longer description for SEO defaults + about copy. */
  blurb: string;
};

/** The 4 base theme colors + scalar knobs (matches theme.validation input). */
export type SampleTheme = {
  accent: string;
  accent2: string;
  ink: string;
  paper: string;
  font?: string;
  baseSize?: number;
  headingScale?: number;
  leading?: number;
  density?: number;
  radius?: string;
  shadow?: string;
};

/** A nav item; children make a dropdown. `href` MUST resolve to a seeded page. */
export type SampleMenuItem = {
  label: string;
  href: string;
  children?: Array<{ label: string; href: string }>;
};

/** A standalone page (or post when kind='post'). */
export type SamplePage = {
  slug: string;
  route: string;
  title: string;
  kind?: "page" | "post";
  template?: string;
  seoTitle?: string;
  seoDescription?: string;
  hasPaywall?: boolean;
  /** Parent post-list page slug (posts nest under it), resolved by apply. */
  parentSlug?: string;
  blocks: Block[];
};

/** A CMS entry (project / guide / resource / hub / custom). */
export type SampleEntry = {
  type: string;
  slug: string;
  title: string;
  data: Record<string, unknown>;
  status?: "draft" | "published";
  sortOrder?: number;
  blocks?: Block[];
};

export type SampleCollection = {
  slug: string;
  name: string;
  description: string;
  visible: boolean;
};

export type SampleProduct = {
  slug: string;
  name: string;
  priceCents: number;
  compareAtCents?: number | null;
  sku: string;
  description: string;
  inventory: number;
  lowStockThreshold: number;
  collections: string[];
  variants?: Array<{ label: string; priceCents: number; inventory: number; sku: string }>;
};

/** A sample CRM person (fictional — no real PII). */
export type SamplePerson = {
  name: string;
  email: string;
  kind: "member" | "subscriber" | "lead";
  status?: "active" | "invited";
};

/** A bookable meeting type (scheduling). Price>0 exercises the paid-booking
 *  gated path (locked until Stripe is configured). */
export type SampleEventType = {
  slug: string;
  name: string;
  durationMin: number;
  priceCents: number;
  description: string;
  locations: string[];
};

/** A reusable saved block (global symbol) a pack defines and its pages reference
 *  via `symbol(id)`. Seeded into the `symbols` table on apply, with the pack-local
 *  `id` used verbatim so page trees resolve it. */
export type SampleSymbol = {
  id: string;
  name: string;
  blocks: Block[];
};

export type SamplePack = {
  meta: SamplePackMeta;
  theme: SampleTheme;
  /** Header/footer nav. Every href must be a seeded route (validated on apply). */
  menu: SampleMenuItem[];
  /** Reusable saved blocks the pages reference via symbol(id). Seeded first. */
  symbols?: SampleSymbol[];
  pages: SamplePage[];
  entries?: SampleEntry[];
  shop?: {
    collections: SampleCollection[];
    products: SampleProduct[];
  };
  people?: SamplePerson[];
  eventTypes?: SampleEventType[];
};

import { newBlockId } from "@/blocks/tree";
import type { BlockNode } from "@/blocks/types";
import type { ChromeOwnerType } from "./owners";

/**
 * Chrome starter TEMPLATES — the successors to the 16 header + 14 footer
 * recipes, now shipped as pre-composed block trees the chrome editor's template
 * picker offers (mirrors how design-packs ship page templates). The author
 * picks one, then edits the blocks freely. A subset of the nicest recipes is
 * provided; not every one of the 30 needs to be perfect.
 *
 * Each `build(menuId)` wires the given menu into the nav/columns so a freshly
 * picked template is immediately populated (menuId comes from the seeded Main
 * menu; the picker passes the site's first menu).
 */

const b = (type: string, content: Record<string, unknown>): BlockNode => ({
  id: newBlockId(),
  type,
  content,
});

export type ChromeTemplate = {
  id: string;
  label: string;
  group: string;
  owner: ChromeOwnerType;
  build: (menuId: string) => BlockNode[];
};

// ── Header templates ────────────────────────────────────────────────────────
const HEADER_TEMPLATES: ChromeTemplate[] = [
  {
    id: "header-center-cta",
    label: "Centered nav + CTA",
    group: "Marketing",
    owner: "chrome:header",
    build: (menuId) => [
      b("site-header", {
        sticky: true,
        layout: "split",
        transparentOnHero: false,
        blocks: [
          b("logo", { text: "", style: "mark", icon: "", big: false, invert: false }),
          b("nav-menu", { menuId, variant: "plain", mobileStyle: "drawer-right", ariaLabel: "Primary" }),
          b("cta-button", { label: "Get started", href: "", variant: "solid" }),
        ],
      }),
    ],
  },
  {
    id: "header-left-nav",
    label: "Left nav + CTA",
    group: "Marketing",
    owner: "chrome:header",
    build: (menuId) => [
      b("site-header", {
        sticky: true,
        layout: "spread",
        transparentOnHero: false,
        blocks: [
          b("logo", { text: "", style: "mark", icon: "", big: false, invert: false }),
          b("nav-menu", { menuId, variant: "plain", mobileStyle: "drawer-right", ariaLabel: "Primary" }),
          b("cta-button", { label: "Join", href: "", variant: "accent" }),
        ],
      }),
    ],
  },
  {
    id: "header-underline-minimal",
    label: "Underline minimal",
    group: "Editorial",
    owner: "chrome:header",
    build: (menuId) => [
      b("site-header", {
        sticky: true,
        layout: "spread",
        transparentOnHero: false,
        blocks: [
          b("logo", { text: "", style: "wordmark", icon: "", big: false, invert: false }),
          b("nav-menu", { menuId, variant: "underline", mobileStyle: "fullscreen", ariaLabel: "Primary" }),
        ],
      }),
    ],
  },
  {
    id: "header-pill-nav",
    label: "Pill nav + CTA",
    group: "Marketing",
    owner: "chrome:header",
    build: (menuId) => [
      b("site-header", {
        sticky: true,
        layout: "split",
        transparentOnHero: false,
        blocks: [
          b("logo", { text: "", style: "mark", icon: "", big: false, invert: false }),
          b("nav-menu", { menuId, variant: "pill", mobileStyle: "drawer-right", ariaLabel: "Primary" }),
          b("cta-button", { label: "Get started", href: "", variant: "solid" }),
        ],
      }),
    ],
  },
  {
    id: "header-utility-two-tier",
    label: "Utility two-tier",
    group: "Ecommerce",
    owner: "chrome:header",
    build: (menuId) => [
      b("site-header", {
        sticky: true,
        layout: "center",
        transparentOnHero: false,
        twoTier: true,
        utilityText: "",
        blocks: [
          b("logo", { text: "", style: "mark", icon: "", big: false, invert: false }),
          b("nav-menu", { menuId, variant: "plain", mobileStyle: "drawer-right", ariaLabel: "Primary" }),
          b("cta-button", { label: "Get started", href: "", variant: "solid" }),
        ],
      }),
    ],
  },
  {
    id: "header-app-tabs",
    label: "App tabs",
    group: "Product & docs",
    owner: "chrome:header",
    build: (menuId) => [
      b("site-header", {
        sticky: true,
        layout: "spread",
        transparentOnHero: false,
        blocks: [
          b("logo", { text: "", style: "mark", icon: "", big: false, invert: false }),
          b("nav-menu", { menuId, variant: "tabs", mobileStyle: "drawer-left", ariaLabel: "Primary" }),
        ],
      }),
    ],
  },
  {
    id: "header-stacked-centered",
    label: "Stacked, centered",
    group: "Editorial",
    owner: "chrome:header",
    build: (menuId) => [
      b("site-header", {
        sticky: false,
        layout: "stack",
        transparentOnHero: false,
        blocks: [
          b("logo", { text: "", style: "wordmark", icon: "", big: true, invert: false }),
          b("nav-menu", { menuId, variant: "plain", mobileStyle: "dropdown", ariaLabel: "Primary" }),
        ],
      }),
    ],
  },
  {
    id: "header-sidebar-vertical",
    label: "Vertical sidebar",
    group: "Product & docs",
    owner: "chrome:header",
    build: (menuId) => [
      b("site-header", {
        sticky: true,
        layout: "sidebar",
        transparentOnHero: false,
        blocks: [
          b("logo", { text: "", style: "mark", icon: "", big: false, invert: false }),
          b("nav-menu", { menuId, variant: "vertical", mobileStyle: "drawer-left", ariaLabel: "Primary" }),
          b("cta-button", { label: "Get started", href: "", variant: "solid" }),
        ],
      }),
    ],
  },
  {
    id: "header-announcement-center",
    label: "Announcement + centered nav",
    group: "Marketing",
    owner: "chrome:header",
    build: (menuId) => [
      b("announcement", {
        style: "solid",
        tone: "ink",
        messages: [{ text: "Announce something here.", ctaLabel: "", ctaHref: "" }],
      }),
      b("site-header", {
        sticky: true,
        layout: "split",
        transparentOnHero: false,
        blocks: [
          b("logo", { text: "", style: "mark", icon: "", big: false, invert: false }),
          b("nav-menu", { menuId, variant: "plain", mobileStyle: "drawer-right", ariaLabel: "Primary" }),
          b("cta-button", { label: "Get started", href: "", variant: "solid" }),
        ],
      }),
    ],
  },
];

// ── Footer templates ────────────────────────────────────────────────────────
const FOOTER_TEMPLATES: ChromeTemplate[] = [
  {
    id: "footer-simple-centered",
    label: "Simple centered",
    group: "Minimal",
    owner: "chrome:footer",
    build: (menuId) => [
      b("site-footer", {
        layout: "centered",
        dark: false,
        copyright: "",
        blocks: [
          b("logo", { text: "", style: "mark", icon: "", big: false, invert: false }),
          b("social-links", { menuId, align: "center" }),
        ],
      }),
    ],
  },
  {
    id: "footer-multi-column",
    label: "Multi-column",
    group: "SaaS",
    owner: "chrome:footer",
    build: (menuId) => [
      b("site-footer", {
        layout: "columns",
        dark: false,
        copyright: "",
        blocks: [
          b("logo", { text: "", style: "mark", icon: "", big: false, invert: false }),
          b("footer-column", { title: "Explore", menuId }),
          b("footer-column", { title: "Company", menuId }),
          b("social-links", { menuId, align: "left" }),
        ],
      }),
    ],
  },
  {
    id: "footer-two-column-brand",
    label: "Two-column brand",
    group: "SaaS",
    owner: "chrome:footer",
    build: (menuId) => [
      b("site-footer", {
        layout: "split",
        dark: false,
        copyright: "",
        blocks: [
          b("logo", { text: "", style: "mark", icon: "", big: false, invert: false }),
          b("footer-column", { title: "Explore", menuId }),
        ],
      }),
    ],
  },
  {
    id: "footer-colored-block",
    label: "Colored block (dark)",
    group: "Marketing",
    owner: "chrome:footer",
    build: (menuId) => [
      b("site-footer", {
        layout: "columns",
        dark: true,
        copyright: "",
        blocks: [
          b("logo", { text: "", style: "mark", icon: "", big: false, invert: true }),
          b("footer-column", { title: "Explore", menuId }),
          b("footer-column", { title: "Company", menuId }),
          b("cta-button", { label: "Get started", href: "", variant: "accent" }),
        ],
      }),
    ],
  },
  {
    id: "footer-statement-wordmark",
    label: "Statement wordmark",
    group: "Editorial",
    owner: "chrome:footer",
    build: (menuId) => [
      b("site-footer", {
        layout: "split",
        dark: false,
        copyright: "",
        blocks: [
          b("logo", { text: "", style: "wordmark", icon: "", big: true, invert: false }),
          b("social-links", { menuId, align: "right" }),
        ],
      }),
    ],
  },
];

export const CHROME_TEMPLATES: ChromeTemplate[] = [...HEADER_TEMPLATES, ...FOOTER_TEMPLATES];

/** Templates offered for a given chrome owner. */
export const chromeTemplatesFor = (owner: ChromeOwnerType): ChromeTemplate[] =>
  CHROME_TEMPLATES.filter((t) => t.owner === owner);

/** The default seeded tree for an owner — the first (nicest) template. */
export const defaultChromeTree = (owner: ChromeOwnerType, menuId: string): BlockNode[] => {
  const first = chromeTemplatesFor(owner)[0];
  return first ? first.build(menuId) : [];
};

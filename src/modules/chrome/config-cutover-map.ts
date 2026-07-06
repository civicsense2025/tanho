import { createId } from "@paralleldrive/cuid2";
import type { BlockNode } from "@/blocks/types";

/**
 * Old config-driven chrome → new block-tree mapping. The old settings.header/
 * footer/announcement schemas were deleted with the Phase 3 chrome-as-blocks
 * cutover (they're recovered here as loose types — never re-add the actual
 * validation module, that system is retired); this module is the one-time
 * bridge for a real site that configured chrome BEFORE that cutover and needs
 * its choices carried into the new block trees, not lost.
 *
 * Every function here is PURE — no DB reads, no `mediaPublicUrl` resolution.
 * The caller (scripts/migrate-chrome-config-to-blocks.ts) does IO; this module
 * only shapes data, so its mapping decisions are unit-testable without a DB.
 */

const b = (type: string, content: Record<string, unknown>): BlockNode => ({
  id: `b_${createId()}`,
  type,
  content,
});

export type MigrationIssue = { kind: string; detail: string };

// ─── Old config shapes (recovered from the deleted validation.ts — do not
// import a live module, none exists; these are the historical record) ───────

type OldLogoConfig = {
  text: string;
  style: "mark" | "wordmark" | "icon" | "image";
  icon: string;
  mediaId: string | null;
};

export type OldHeaderConfig = {
  layout: string; // one of the 16 HEADER_LAYOUT_IDS
  logo: OldLogoConfig;
  menuId: string;
  cta: { enabled: boolean; label: string; href: string; variant: "solid" | "accent" | "outline" };
  sticky: boolean;
  transparentOnHero: boolean;
  mobile: { style: "drawer-right" | "drawer-left" | "fullscreen" | "dropdown" };
};

export type OldFooterConfig = {
  layout: string; // one of the 14 FOOTER_LAYOUT_IDS
  logo: OldLogoConfig;
  columns: Array<{ title: string; menuId: string }>;
  socialMenuId: string;
  newsletter: { enabled: boolean; title: string; body: string; cta: string };
  copyright: string;
};

export type OldAnnouncementConfig = {
  enabled: boolean;
  style: "solid" | "gradient" | "outline" | "marquee";
  tone: "ink" | "accent" | "accent2" | "paper";
  dismissible: boolean;
  rotateMs: number;
  messages: Array<{ text: string; cta?: { label: string; url: string } }>;
};

// ─── Header recipe table (the 16 HEADER_RECIPES, read from the deleted
// header-recipes.ts before designing this mapping) ──────────────────────────

type HeaderRecipeMapping = {
  /** New site-header.layout this recipe's structural arrangement becomes. */
  layout: "spread" | "center" | "split" | "stack" | "sidebar";
  /** New nav-menu.variant. */
  navVariant: "plain" | "underline" | "tabs" | "pill" | "vertical";
  /** True = this recipe hides the nav entirely (navPos: "hidden"). */
  noNav?: boolean;
  /** True = this recipe splits the nav into two nav-menu blocks around a
   *  centered logo (navPos: "split" — only 2 of 16 recipes). */
  splitNav?: boolean;
  /** True = tiers: 2 (adds the two-tier utility strip). */
  twoTier?: boolean;
  /** True = recipe.overlay (transparentOnHero). */
  overlay?: boolean;
  /** True = logoPos: "centerBig" (logo.big). */
  bigLogo?: boolean;
  /** Recipe dimensions with NO destination in the new block system — reported,
   *  never silently dropped (confirmed decorative-only in the OLD system too:
   *  aria-hidden stubs, see HeaderExtras.tsx's own doc comment). */
  droppedDecorative?: string[];
};

const HEADER_RECIPE_MAP: Record<string, HeaderRecipeMapping> = {
  "center-cta": { layout: "center", navVariant: "plain" },
  "left-nav": { layout: "spread", navVariant: "plain" },
  "split-center-logo": { layout: "split", navVariant: "plain", splitNav: true },
  "minimal-right": { layout: "spread", navVariant: "plain" }, // navPos:"right" has no direct new layout; spread is the closest working arrangement
  "icon-only": { layout: "spread", navVariant: "plain", noNav: true },
  "stacked-centered": { layout: "stack", navVariant: "plain" },
  "search-forward": { layout: "spread", navVariant: "plain", droppedDecorative: ["search"] },
  "ecommerce-icons": { layout: "spread", navVariant: "plain", droppedDecorative: ["icons(2)"] },
  "overlay-transparent": { layout: "center", navVariant: "plain", overlay: true },
  "sidebar-vertical": { layout: "sidebar", navVariant: "vertical" },
  "split-luxury": { layout: "split", navVariant: "plain", splitNav: true },
  "pill-nav": { layout: "split", navVariant: "pill" },
  "underline-minimal": { layout: "spread", navVariant: "underline" },
  "utility-two-tier": { layout: "center", navVariant: "plain", twoTier: true },
  "app-tabs": { layout: "spread", navVariant: "tabs", droppedDecorative: ["avatar"] },
  "editorial-statement": { layout: "spread", navVariant: "plain", bigLogo: true }, // navPos:"right" — see minimal-right note
};

// ─── Footer recipe table (the 14 FOOTER_RECIPES) ────────────────────────────

type FooterRecipeMapping = {
  layout: "columns" | "centered" | "split";
  dark?: boolean;
  /** Recipe dimensions with no destination — the old system's own newsletter
   *  widget was never wired to a real backend either (its own code comment:
   *  "wires to the newsletter module when it lands"), so unlike search/icons
   *  THIS one is now real (see blocks/newsletter) — mapped, not dropped. */
  droppedDecorative?: string[];
};

const FOOTER_RECIPE_MAP: Record<string, FooterRecipeMapping> = {
  "simple-centered": { layout: "centered" },
  "multi-column": { layout: "columns" },
  "cta-banner": { layout: "columns", droppedDecorative: ["banner"] },
  "newsletter-forward": { layout: "columns" },
  "mega-ecommerce": { layout: "columns", droppedDecorative: ["badges"] },
  "two-column-brand": { layout: "split" },
  "sitemap-dense": { layout: "columns" },
  "utility-minimal": { layout: "centered", dark: true },
  "split-bar-thin": { layout: "split" },
  "statement-wordmark": { layout: "split" },
  "contact-forward": { layout: "columns", droppedDecorative: ["contact-block"] },
  "legal-heavy": { layout: "columns" },
  "map-location": { layout: "columns", droppedDecorative: ["map-embed"] },
  "colored-block": { layout: "columns", dark: true },
};

/** Fallback used when an unrecognized recipe id shows up (schema drift/manual
 *  DB edit) — never throws, always produces a working (if generic) header. */
const HEADER_FALLBACK: HeaderRecipeMapping = { layout: "spread", navVariant: "plain" };
const FOOTER_FALLBACK: FooterRecipeMapping = { layout: "columns" };

/**
 * Old logo config → new logo block content. The new logo block has no
 * `style: "image"` value at all — `src` independently wins over the
 * typographic mark whenever it's set, regardless of `style` (see
 * blocks/logo/fields.ts). So an old `style:"image"` config maps its
 * `mediaId` into `src` (resolved by the caller via `mediaPublicUrl` and
 * passed in as `resolvedSrc` — this function stays pure/DB-free) and its
 * `style` field falls back to `"mark"`, since there's no old-style
 * equivalent to preserve once "image" itself isn't a style option anymore.
 * A non-"image" old style (mark/wordmark/icon) passes straight through
 * unchanged, with `src` empty.
 */
function mapLogo(old: OldLogoConfig, resolvedSrc: string | null, big: boolean): BlockNode {
  const wasImage = old.style === "image";
  return b("logo", {
    text: old.text,
    style: wasImage ? "mark" : old.style,
    icon: old.icon,
    src: wasImage ? (resolvedSrc ?? "") : "",
    big,
    invert: false,
  });
}

export type MappedHeader = { blocks: BlockNode[]; issues: MigrationIssue[] };

/**
 * `logoSrc` is the already-resolved media URL for `header.logo.mediaId`
 * (`null` if unset or resolution failed) — resolved by the caller so this
 * function stays a pure, DB-free mapping decision.
 */
export function mapOldHeaderConfig(header: OldHeaderConfig, logoSrc: string | null): MappedHeader {
  const issues: MigrationIssue[] = [];
  const recipe = HEADER_RECIPE_MAP[header.layout];
  if (!recipe) {
    issues.push({
      kind: "header-recipe-unrecognized",
      detail: `layout "${header.layout}" isn't one of the 16 known recipes — used a generic spread/plain fallback instead of guessing.`,
    });
  }
  const m = recipe ?? HEADER_FALLBACK;

  if (m.droppedDecorative?.length) {
    issues.push({
      kind: "header-decorative-dropped",
      detail: `layout "${header.layout}": ${m.droppedDecorative.join(", ")} — confirmed decorative-only (aria-hidden stub) in the OLD system too; nothing functional was ever there to preserve.`,
    });
  }
  if (m.splitNav) {
    issues.push({
      kind: "header-split-nav-migrated",
      detail: `layout "${header.layout}": split-around-logo nav migrated using nav-menu's slice field (2 blocks, first-half/second-half) — a real, working reproduction of the old arrangement, not an approximation.`,
    });
  }
  if (header.layout === "minimal-right" || header.layout === "editorial-statement") {
    issues.push({
      kind: "header-navpos-right-approximated",
      detail: `layout "${header.layout}": old navPos:"right" pushed the nav to the far right with no CTA; the new "spread" layout (logo left, nav pushed right) is the closest visual match but isn't a pixel-identical reproduction of a plain right-aligned nav with no logo offset.`,
    });
  }

  const kids: BlockNode[] = [];
  const logoBig = m.bigLogo ?? false;

  if (m.splitNav) {
    kids.push(
      b("nav-menu", {
        menuId: header.menuId,
        variant: m.navVariant,
        mobileStyle: header.mobile.style,
        ariaLabel: "Primary",
        slice: "first-half",
      }),
    );
    kids.push(mapLogo(header.logo, logoSrc, logoBig));
    kids.push(
      b("nav-menu", {
        menuId: header.menuId,
        variant: m.navVariant,
        mobileStyle: header.mobile.style,
        ariaLabel: "Secondary",
        slice: "second-half",
      }),
    );
  } else {
    kids.push(mapLogo(header.logo, logoSrc, logoBig));
    if (!m.noNav) {
      kids.push(
        b("nav-menu", {
          menuId: header.menuId,
          variant: m.navVariant,
          mobileStyle: header.mobile.style,
          ariaLabel: "Primary",
        }),
      );
    } else {
      issues.push({
        kind: "header-nav-hidden",
        detail: `layout "${header.layout}" (navPos:"hidden") — no nav-menu block added, matching the old recipe's logo-only arrangement.`,
      });
    }
  }
  if (header.cta.enabled && header.cta.label && header.cta.href) {
    kids.push(b("cta-button", { label: header.cta.label, href: header.cta.href, variant: header.cta.variant }));
  }

  const siteHeader = b("site-header", {
    sticky: header.sticky,
    layout: m.layout,
    transparentOnHero: header.transparentOnHero || (m.overlay ?? false),
    twoTier: m.twoTier ?? false,
    utilityText: "",
    blocks: kids,
  });

  return { blocks: [siteHeader], issues };
}

export type MappedFooter = { blocks: BlockNode[]; issues: MigrationIssue[] };

/**
 * `logoSrc` — see mapOldHeaderConfig. `columnMenuNames` — old footer columns
 * only stored a `menuId`; the new footer-column block ALSO wants a `title`
 * the old config already had per-column, so no extra lookup is needed there.
 */
export function mapOldFooterConfig(footer: OldFooterConfig, logoSrc: string | null): MappedFooter {
  const issues: MigrationIssue[] = [];
  const recipe = FOOTER_RECIPE_MAP[footer.layout];
  if (!recipe) {
    issues.push({
      kind: "footer-recipe-unrecognized",
      detail: `layout "${footer.layout}" isn't one of the 14 known recipes — used a generic columns fallback instead of guessing.`,
    });
  }
  const m = recipe ?? FOOTER_FALLBACK;

  if (m.droppedDecorative?.length) {
    issues.push({
      kind: "footer-structural-variant-dropped",
      detail: `layout "${footer.layout}": ${m.droppedDecorative.join(", ")} — this specific structural variant (not a real feature, a layout arrangement) has no equivalent block composition yet; migrated to the closest working layout (${m.layout}) instead.`,
    });
  }

  const kids: BlockNode[] = [mapLogo(footer.logo, logoSrc, false)];

  for (const col of footer.columns) {
    kids.push(b("footer-column", { title: col.title, menuId: col.menuId }));
  }
  if (footer.socialMenuId) {
    kids.push(b("social-links", { menuId: footer.socialMenuId, align: "left" }));
  }
  if (footer.newsletter.enabled) {
    // The old footer's newsletter widget was NEVER wired to a real backend
    // (its own source comment: "wires to the newsletter module when it
    // lands") — this migration is that module landing. `compact` matches the
    // new block's footer-fit variant (see blocks/newsletter's own README).
    kids.push(
      b("newsletter", {
        variant: "compact",
        title: footer.newsletter.title || "Subscribe to the newsletter",
        body: footer.newsletter.body,
        placeholder: "you@example.com",
        cta: footer.newsletter.cta || "Subscribe",
        list: "default",
        trackEvent: "",
        params: {},
      }),
    );
    issues.push({
      kind: "footer-newsletter-activated",
      detail: `layout "${footer.layout}": newsletter.enabled was true, but the old widget never had a real backend (source comment: "wires to the newsletter module when it lands"). Migrated to the real newsletter block — first genuine functional signup form this footer has ever had, not a like-for-like port.`,
    });
  }

  const siteFooter = b("site-footer", {
    layout: m.layout,
    dark: m.dark ?? false,
    copyright: footer.copyright,
    blocks: kids,
  });

  return { blocks: [siteFooter], issues };
}

export type MappedAnnouncement = { blocks: BlockNode[]; issues: MigrationIssue[] };

/**
 * `enabled: false` old rows produce an EMPTY blocks array (no announcement
 * block at all) — the new block's mere presence in the tree means "shown," so
 * a disabled old config correctly maps to "not present," not to a present-but-
 * hidden block (there's no `enabled` field on the new schema to even carry
 * that state, and there shouldn't be — see the block's own def.ts).
 */
export function mapOldAnnouncementConfig(old: OldAnnouncementConfig): MappedAnnouncement {
  const issues: MigrationIssue[] = [];
  if (!old.enabled || old.messages.length === 0) {
    return { blocks: [], issues };
  }

  if (!old.dismissible) {
    issues.push({
      kind: "announcement-dismissible-dropped",
      detail: "dismissible:false had no real destination even before this migration — the new announcement block dropped ALL client-side dismissal state (localStorage) in the Phase 3 rearchitecture, for both dismissible:true and false rows, since a block Render can't hold client state (see the block's own def.ts comment). Not something this migration changed.",
    });
  }
  if (old.style !== "marquee" && old.rotateMs !== 6000) {
    issues.push({
      kind: "announcement-rotation-dropped",
      detail: `rotateMs:${old.rotateMs} on a static style ("${old.style}") had no effect even in the old system (only "marquee" rotated) — nothing lost. For "marquee" rows, rotation is now pure-CSS scrolling of ALL messages rather than a timed JS rotation through them one at a time; a real behavior change, noted separately if style is marquee.`,
    });
  }
  if (old.style === "marquee") {
    issues.push({
      kind: "announcement-marquee-behavior-changed",
      detail: `style:"marquee" — the old system JS-rotated through messages one at a time every ${old.rotateMs}ms; the new block's marquee style is a continuous CSS-only scroll showing all messages at once. Same intent (show multiple messages), different mechanism and pacing.`,
    });
  }

  const messages = old.messages.slice(0, 5).map((msg) => ({
    text: msg.text,
    ctaLabel: msg.cta?.label ?? "",
    ctaHref: msg.cta?.url ?? "",
  }));

  const announcement = b("announcement", {
    style: old.style,
    tone: old.tone,
    messages,
  });

  return { blocks: [announcement], issues };
}

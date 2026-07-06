import type { BlockCategory, BlockDef, BlockNode } from "./types";
import { newBlockId } from "./tree";
import { hasCapability } from "./capabilities";

import { headingDef } from "./heading/def";
import { symbolDef } from "./symbol/def";
import { collectionDef } from "./collection/def";
import { testimonialDef } from "./testimonial/def";
import { statementDef } from "./statement/def";
import { pollDef } from "./poll/def";
import { richtextDef } from "./richtext/def";
import { quoteDef } from "./quote/def";
import { codeDef } from "./code/def";
import { calloutDef } from "./callout/def";
import { listDef } from "./list/def";
import { buttonsDef } from "./buttons/def";
import { tableOfContentsDef } from "./table-of-contents/def";
import { breadcrumbsDef } from "./breadcrumbs/def";
import { readingProgressDef } from "./reading-progress/def";
import { jumpToTopDef } from "./jump-to-top/def";
import { relatedContentDef } from "./related-content/def";
import { sectionDef } from "./section/def";
import { containerDef } from "./container/def";
import { rowDef } from "./row/def";
import { columnsDef } from "./columns/def";
import { spacerDef } from "./spacer/def";
import { dividerDef } from "./divider/def";
import { accordionDef } from "./accordion/def";
import { imageDef } from "./image/def";
import { galleryDef } from "./gallery/def";
import { videoDef } from "./video/def";
import { carouselDef } from "./carousel/def";
import { embedDef } from "./embed/def";
import { metricDef } from "./metric/def";
import { tableDef } from "./table/def";
import { chartDef } from "./chart/def";
import { timelineDef } from "./timeline/def";
import { progressDef } from "./progress/def";
import { stepperDef } from "./stepper/def";
import { toggleDef } from "./toggle/def";
import { ratingDef } from "./rating/def";
import { alertDef } from "./alert/def";
import { badgeDef } from "./badge/def";
import { iconDef } from "./icon/def";
import { faqDef } from "./faq/def";
import { marqueeDef } from "./marquee/def";
import { counterDef } from "./counter/def";
import { flipCardDef } from "./flip-card/def";
import { beforeAfterDef } from "./before-after/def";
import { tabsDef } from "./tabs/def";
import { tooltipDef } from "./tooltip/def";
import { countdownDef } from "./countdown/def";
import { htmlEmbedDef } from "./html-embed/def";
import { lottieDef } from "./lottie/def";
import { profileHeaderDef } from "./profile-header/def";
import { projectListDef } from "./project-list/def";
import { experienceListDef } from "./experience-list/def";
import { skillsListDef } from "./skills-list/def";
import { awardListDef } from "./award-list/def";
import { educationListDef } from "./education-list/def";
import { paywallDef } from "./paywall/def";
import { newsletterDef } from "./newsletter/def";
import { accountDef } from "./account/def";
import { postlistDef } from "./postlist/def";
import { productDef } from "./product/def";
import { productgridDef } from "./productgrid/def";
import { pricingDef } from "./pricing/def";
import { checkoutDef } from "./checkout/def";
import { donationDef } from "./donation/def";
import { bookingDef } from "./booking/def";
import { formDef } from "./form/def";
import { entryListDef } from "./entry-list/def";
import { fieldDef } from "./field/def";

// ─── BEGIN phase3-chrome-blocks (site header/footer as blocks) ──────────────
// Contiguous block for easy merge — another worktree also edits this file.
import { siteHeaderDef } from "./site-header/def";
import { siteFooterDef } from "./site-footer/def";
import { navMenuDef } from "./nav-menu/def";
import { logoDef } from "./logo/def";
import { ctaButtonDef } from "./cta-button/def";
import { footerColumnDef } from "./footer-column/def";
import { socialLinksDef } from "./social-links/def";
import { announcementDef } from "./announcement/def";
// ─── END phase3-chrome-blocks ───────────────────────────────────────────────
import { searchTriggerDef } from "./search-trigger/def";

/** Picker order. */
export const categories: Array<{ id: BlockCategory; label: string; hint: string }> = [
  { id: "content", label: "Content", hint: "Words, structure, calls to action" },
  { id: "layout", label: "Layout", hint: "Arrange, space and group" },
  { id: "media", label: "Media", hint: "Image, video, embeds" },
  { id: "data", label: "Data & reports", hint: "Numbers, tables, charts" },
  { id: "commerce", label: "Ecommerce", hint: "Products, pricing, checkout" },
  { id: "interactive", label: "Interactive", hint: "Forms, FAQ, live widgets" },
  { id: "newsletter", label: "Newsletter", hint: "Posts, subscribe, paywall" },
  { id: "dynamic", label: "Dynamic data", hint: "Bound to live CMS records" },
  // phase3-chrome-blocks: header/footer building blocks.
  { id: "chrome", label: "Header & footer", hint: "Site header, footer, nav" },
];

/**
 * THE single source of truth. Picker, editor, inspector, and renderer all
 * read from this list — a block registers here or it doesn't exist.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defs: Array<BlockDef<any>> = [
  headingDef,
  symbolDef,
  richtextDef,
  quoteDef,
  statementDef,
  testimonialDef,
  codeDef,
  calloutDef,
  listDef,
  buttonsDef,
  tableOfContentsDef,
  breadcrumbsDef,
  readingProgressDef,
  jumpToTopDef,
  sectionDef,
  containerDef,
  rowDef,
  columnsDef,
  spacerDef,
  dividerDef,
  accordionDef,
  imageDef,
  galleryDef,
  videoDef,
  carouselDef,
  embedDef,
  metricDef,
  tableDef,
  chartDef,
  timelineDef,
  progressDef,
  stepperDef,
  toggleDef,
  ratingDef,
  alertDef,
  badgeDef,
  iconDef,
  faqDef,
  pollDef,
  marqueeDef,
  counterDef,
  flipCardDef,
  beforeAfterDef,
  tabsDef,
  tooltipDef,
  countdownDef,
  htmlEmbedDef,
  lottieDef,
  relatedContentDef,
  profileHeaderDef,
  projectListDef,
  experienceListDef,
  skillsListDef,
  awardListDef,
  educationListDef,
  paywallDef,
  newsletterDef,
  accountDef,
  postlistDef,
  productDef,
  productgridDef,
  pricingDef,
  checkoutDef,
  donationDef,
  bookingDef,
  formDef,
  entryListDef,
  collectionDef,
  fieldDef,
  // ─── BEGIN phase3-chrome-blocks ───────────────────────────────────────────
  siteHeaderDef,
  siteFooterDef,
  navMenuDef,
  logoDef,
  ctaButtonDef,
  footerColumnDef,
  socialLinksDef,
  announcementDef,
  // ─── END phase3-chrome-blocks ─────────────────────────────────────────────
  searchTriggerDef,
];

const byType = new Map(defs.map((d) => [d.type, d]));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function blockDef(type: string): BlockDef<any> | undefined {
  return byType.get(type);
}

export function allBlockDefs() {
  return defs;
}

/** True unless the block needs an optional dependency the customer removed — then it's
 *  hidden everywhere (picker + render), the graceful-degradation contract. */
export function blockAvailable(def: BlockDef): boolean {
  return !def.requiresCapability || hasCapability(def.requiresCapability);
}

export function pickerDefs(category?: BlockCategory) {
  return defs.filter(
    (d) => !d.hidden && blockAvailable(d) && (!category || d.category === category),
  );
}

/** Whether a block is specially suggested for a content-type slug (its
 *  `suggestedFor` includes that slug or the wildcard `"*"`). */
export function isSuggestedFor(type: string, slug: string): boolean {
  const s = byType.get(type)?.suggestedFor;
  return !!s && (s.includes("*") || s.includes(slug));
}

/** Creates a fresh block of a type with its default content. */
export function createBlock(type: string): BlockNode {
  const def = byType.get(type);
  if (!def) throw new Error(`Unknown block type: ${type}`);
  return { id: newBlockId(), type, content: def.make() as Record<string, unknown> };
}

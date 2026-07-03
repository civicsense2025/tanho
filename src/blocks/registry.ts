import type { BlockCategory, BlockDef, BlockNode } from "./types";
import { newBlockId } from "./tree";

import { headingDef } from "./heading/def";
import { richtextDef } from "./richtext/def";
import { quoteDef } from "./quote/def";
import { codeDef } from "./code/def";
import { calloutDef } from "./callout/def";
import { listDef } from "./list/def";
import { buttonsDef } from "./buttons/def";
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
];

/**
 * THE single source of truth. Picker, editor, inspector, and renderer all
 * read from this list — a block registers here or it doesn't exist.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defs: Array<BlockDef<any>> = [
  headingDef,
  richtextDef,
  quoteDef,
  codeDef,
  calloutDef,
  listDef,
  buttonsDef,
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
];

const byType = new Map(defs.map((d) => [d.type, d]));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function blockDef(type: string): BlockDef<any> | undefined {
  return byType.get(type);
}

export function allBlockDefs() {
  return defs;
}

export function pickerDefs(category?: BlockCategory) {
  return defs.filter((d) => !d.hidden && (!category || d.category === category));
}

/** Creates a fresh block of a type with its default content. */
export function createBlock(type: string): BlockNode {
  const def = byType.get(type);
  if (!def) throw new Error(`Unknown block type: ${type}`);
  return { id: newBlockId(), type, content: def.make() as Record<string, unknown> };
}

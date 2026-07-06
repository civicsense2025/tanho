import type { BlockDef } from "../types";
import { faqSchema, makeFaq } from "./fields";
import { RenderFaq } from "./Render";

export const faqDef: BlockDef<typeof faqSchema> = {
  type: "faq",
  category: "content",
  label: "FAQ",
  icon: "faq",
  blurb: "Q&A list with SEO structured data",
  schema: faqSchema,
  make: makeFaq,
  Render: RenderFaq,
};

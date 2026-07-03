import type { BlockDef } from "../types";
import { makePricing, pricingSchema } from "./fields";
import { RenderPricing } from "./Render";

export const pricingDef: BlockDef<typeof pricingSchema> = {
  type: "pricing",
  category: "commerce",
  label: "Pricing table",
  icon: "columns",
  blurb: "Tier comparison — typed copy, one featured column",
  schema: pricingSchema,
  make: makePricing,
  Render: RenderPricing,
};

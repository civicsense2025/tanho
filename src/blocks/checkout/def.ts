import type { BlockDef } from "../types";
import { checkoutSchema, makeCheckout } from "./fields";
import { RenderCheckout } from "./Render";

export const checkoutDef: BlockDef<typeof checkoutSchema> = {
  type: "checkout",
  category: "commerce",
  label: "Checkout summary",
  icon: "cart",
  blurb: "Static cart-summary CTA card (marketing/preview)",
  schema: checkoutSchema,
  make: makeCheckout,
  Render: RenderCheckout,
};

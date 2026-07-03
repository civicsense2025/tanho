import type { BlockDef } from "../types";
import { makeProduct, productSchema } from "./fields";
import { RenderProduct } from "./Render";

export const productDef: BlockDef<typeof productSchema> = {
  type: "product",
  category: "commerce",
  label: "Product card",
  icon: "tag",
  blurb: "Static promo card — typed copy, links to the shop",
  schema: productSchema,
  make: makeProduct,
  Render: RenderProduct,
};

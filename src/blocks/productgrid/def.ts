import type { BlockDef } from "../types";
import { makeProductgrid, productgridSchema } from "./fields";
import { RenderProductgrid } from "./Render";

export const productgridDef: BlockDef<typeof productgridSchema> = {
  type: "productgrid",
  category: "commerce",
  label: "Product grid",
  icon: "grid",
  blurb: "Static grid of promo items — typed copy",
  schema: productgridSchema,
  make: makeProductgrid,
  Render: RenderProductgrid,
};

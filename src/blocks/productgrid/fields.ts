import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const productGridItemSchema = z.object({
  name: z.string().max(160).default(""),
  price: z.string().max(60).default(""),
  image: z.string().max(2000).default(""),
});

/**
 * A static grid of promo items — author copy only. Illustrative marketing
 * block; the live shop is the /shop routes.
 */
export const productgridSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  cols: z.number().int().min(2).max(4).default(3),
  items: z.array(productGridItemSchema).max(48).default([]),
});

export type ProductgridContent = z.infer<typeof productgridSchema>;

export const makeProductgrid = (): ProductgridContent =>
  productgridSchema.parse({
    cols: 3,
    items: [
      { name: "Product one", price: "$29", image: "" },
      { name: "Product two", price: "$39", image: "" },
      { name: "Product three", price: "$49", image: "" },
    ],
  });

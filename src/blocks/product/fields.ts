import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

const hrefSchema = z
  .string()
  .min(1)
  .max(2000)
  .regex(/^(https?:\/\/|\/|#|mailto:)/, "Must be a web URL, /path, #anchor or mailto:");

/**
 * A static promo card an author drops on a marketing page. It carries typed-in
 * copy — it does NOT read live products. The live storefront is /shop.
 */
export const productSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  name: z.string().max(160).default(""),
  priceLabel: z.string().max(60).default(""),
  was: z.string().max(60).default(""),
  badge: z.string().max(40).default(""),
  note: z.string().max(240).default(""),
  cta: z.string().max(60).default("Shop now"),
  href: hrefSchema.default("/shop"),
});

export type ProductContent = z.infer<typeof productSchema>;

export const makeProduct = (): ProductContent =>
  productSchema.parse({
    name: "Featured product",
    priceLabel: "$49",
    was: "",
    badge: "",
    note: "A short line about what makes this worth buying.",
    cta: "Shop now",
    href: "/shop",
  });

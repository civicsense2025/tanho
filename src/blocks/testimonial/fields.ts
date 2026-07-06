import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const testimonialItemSchema = z.object({
  quote: z.string().max(1000).default(""),
  name: z.string().max(120).default(""),
  role: z.string().max(200).default(""),
  /** Optional avatar/logo image URL. */
  avatar: z.union([z.literal(""), z.string().max(2000)]).default(""),
  /** Optional 1–5 star rating; 0 = hide stars (the default). */
  rating: z.number().int().min(0).max(5).default(0),
});

export type TestimonialItem = z.infer<typeof testimonialItemSchema>;

export const testimonialSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  /** View options — the same testimonial content, laid out differently. `grid`
   *  and `single` are pure CSS; `carousel` is a scroll-snap strip (no JS). Shops
   *  want grid or carousel for reviews; a landing page often wants a single quote. */
  layout: z.enum(["grid", "carousel", "single"]).default("grid"),
  /** Column count for the grid layout (ignored by single/carousel). */
  cols: z.number().int().min(1).max(4).default(3),
  items: z.array(testimonialItemSchema).max(30).default([]),
});

export type TestimonialContent = z.infer<typeof testimonialSchema>;

export const makeTestimonial = (): TestimonialContent =>
  testimonialSchema.parse({
    layout: "grid",
    cols: 3,
    items: [
      { quote: "This is the best purchase I've made all year. It just works.", name: "Alex Rivera", role: "Verified buyer", rating: 5 },
      { quote: "Fast shipping, exactly as described, and the quality is superb.", name: "Sam Chen", role: "Verified buyer", rating: 5 },
      { quote: "I recommend this to everyone who asks. Genuinely great.", name: "Jordan Lee", role: "Verified buyer", rating: 5 },
    ],
  });

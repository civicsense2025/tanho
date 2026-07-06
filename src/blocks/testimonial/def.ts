import type { BlockDef } from "../types";
import { makeTestimonial, testimonialSchema } from "./fields";
import { RenderTestimonial } from "./Render";

/** Customer quotes / reviews with grid, carousel, or single-quote view options —
 *  the reviews primitive for shops, plus social proof for any landing page. */
export const testimonialDef: BlockDef<typeof testimonialSchema> = {
  type: "testimonial",
  category: "content",
  label: "Testimonials",
  icon: "quote",
  blurb: "Customer quotes & reviews — grid, carousel, or single",
  schema: testimonialSchema,
  make: makeTestimonial,
  Render: RenderTestimonial,
};

import { z } from "zod";
import { commonContent, styleContent, trackEventSchema, trackParamsSchema, advancedStyleContent, motionContent } from "../common";

/** Newsletter subscribe band — an email input that posts to subscribeAction. */
export const newsletterSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  /** `card` — the bordered page-section band (default). `compact` — a slim
   *  label-and-form fit for a footer column (footer-column's visual language:
   *  small-caps muted label, no border/card chrome, color: inherit so it works
   *  on the dark footer surface too). Named `variant`, not `style` or
   *  `layout` — both those keys are reserved: `style` is the generic
   *  per-block styleContent escape hatch (base/tablet/desktop layers) spread
   *  in above, and Inspector.tsx's field list hardcodes an exclusion for a
   *  key literally named `layout` (meant for the 4 layout-primitive blocks'
   *  layoutStyleContent) — either name would silently vanish from the
   *  inspector's generic ValueField list for THIS block too. */
  variant: z.enum(["card", "compact"]).default("card"),
  title: z.string().max(120).default("Subscribe to the newsletter"),
  body: z.string().max(400).default("Get new posts in your inbox. No spam, unsubscribe anytime."),
  placeholder: z.string().max(80).default("you@example.com"),
  cta: z.string().max(40).default("Subscribe"),
  list: z.string().min(1).max(60).default("default"),
  /** When set, fires this analytics event when the reader submits the form. */
  trackEvent: trackEventSchema,
  params: trackParamsSchema,
});

export type NewsletterContent = z.infer<typeof newsletterSchema>;

export const makeNewsletter = (): NewsletterContent => newsletterSchema.parse({});

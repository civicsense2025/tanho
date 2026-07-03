import { z } from "zod";
import { commonContent, trackEventSchema, trackParamsSchema } from "../common";

/** Newsletter subscribe band — an email input that posts to subscribeAction. */
export const newsletterSchema = z.object({
  ...commonContent,
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

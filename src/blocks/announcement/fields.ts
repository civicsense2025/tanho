import { z } from "zod";
import { commonContent } from "../common";

/** Safe link targets only (same allowlist as menus/buttons), or empty. */
const hrefSchema = z
  .union([
    z.string().max(2000).regex(/^(https?:\/\/|\/|#|mailto:)/, "Must be a web URL, /path, #anchor or mailto:"),
    z.literal(""),
  ])
  .default("");

export const announcementMessageSchema = z.object({
  text: z.string().max(160).default(""),
  ctaLabel: z.string().max(40).default(""),
  ctaHref: hrefSchema,
});
export type AnnouncementMessage = z.infer<typeof announcementMessageSchema>;

/**
 * Announcement bar — a thin strip above the header. Ported from the config
 * `announcement` namespace (style/tone/messages). Pure & no-JS: the first
 * message renders server-side (crawlable); the `marquee` style scrolls all
 * messages with pure CSS. (The old JS-only rotation and localStorage dismissal
 * are dropped — a block Render can't hold client state; a static, always-visible
 * bar is the honest no-JS baseline.)
 */
export const announcementSchema = z.object({
  ...commonContent,
  style: z.enum(["solid", "gradient", "outline", "marquee"]).default("solid"),
  tone: z.enum(["ink", "accent", "accent2", "paper"]).default("ink"),
  /**
   * Up to 5 messages. NOTE: only the `marquee` style shows more than one — it
   * scrolls them all. The static styles (solid/gradient/outline) show just the
   * FIRST message (each with its own CTA); add more only with `style: marquee`,
   * or they won't be displayed.
   */
  messages: z.array(announcementMessageSchema).max(5).default([]),
});

export type AnnouncementContent = z.infer<typeof announcementSchema>;

export const makeAnnouncement = (): AnnouncementContent =>
  announcementSchema.parse({
    style: "solid",
    tone: "ink",
    messages: [{ text: "Welcome — announce something here.", ctaLabel: "", ctaHref: "" }],
  });

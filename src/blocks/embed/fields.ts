import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const embedSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  provider: z.enum(["youtube", "figma", "maps", "vimeo", "spotify", "soundcloud", "twitter", "custom"]).default("youtube"),
  /** For every provider except "twitter", this is the final, already-resolved
   *  iframe src (see modules/embeds/resolve.ts — resolution happens once, at
   *  write time, never live at render). For "twitter" it's the validated
   *  tweet URL itself, since that provider renders a <blockquote> + script,
   *  not an iframe. "custom" is a donation/interactive-form iframe (ActBlue,
   *  Donorbox, …) — an https url on a trusted-host allowlist, not arbitrary. */
  url: z.union([z.literal(""), z.string().max(2000).regex(/^https:\/\//)]).default(""),
  ratio: z.enum(["16 / 9", "4 / 3", "1 / 1", "21 / 9"]).default("16 / 9"),
});

export type EmbedContent = z.infer<typeof embedSchema>;

export const makeEmbed = (): EmbedContent =>
  embedSchema.parse({ provider: "youtube", url: "", ratio: "16 / 9" });

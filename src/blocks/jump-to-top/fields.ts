import { z } from "zod";
import { commonContent } from "../common";

export const jumpToTopSchema = z.object({
  ...commonContent,
  /** Corner the button pins to. */
  align: z.enum(["left", "right"]).default("right"),
  /** Scroll distance (px) before the button appears. */
  showAfter: z.number().int().min(0).max(5000).default(400),
  /** Accessible label / tooltip. */
  label: z.string().max(40).default("Back to top"),
});

export type JumpToTopContent = z.infer<typeof jumpToTopSchema>;

export const makeJumpToTop = (): JumpToTopContent => jumpToTopSchema.parse({});

import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const countdownSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  /** Target instant as an ISO 8601 string (e.g. "2026-12-31T23:59:59Z"). */
  target: z.string().max(40).default(""),
  /** Which units to show. */
  units: z.array(z.enum(["days", "hours", "minutes", "seconds"])).max(4).default(["days", "hours", "minutes", "seconds"]),
  /** Shown once the target has passed. */
  expiredText: z.string().max(200).default("This has ended."),
  label: z.string().max(200).default(""),
});

export type CountdownContent = z.infer<typeof countdownSchema>;

export const makeCountdown = (): CountdownContent =>
  countdownSchema.parse({
    target: "",
    units: ["days", "hours", "minutes", "seconds"],
    expiredText: "This has ended.",
    label: "",
  });

import { z } from "zod";
import { commonContent } from "../common";

export const dividerSchema = z.object({
  ...commonContent,
  style: z.enum(["line", "dotted"]).default("line"),
});

export type DividerContent = z.infer<typeof dividerSchema>;

export const makeDivider = (): DividerContent => dividerSchema.parse({ style: "line" });

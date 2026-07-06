import { z } from "zod";
import { commonContent, styleContent, advancedStyleContent, motionContent } from "../common";

export const statementSchema = z.object({
  ...commonContent,
  ...styleContent,
  ...advancedStyleContent,
  ...motionContent,
  /** The large statement text — a manifesto line, mission, or pull-quote. */
  text: z.string().max(600).default(""),
  /** Optional smaller attribution/subtext below. */
  cite: z.string().max(200).default(""),
  align: z.enum(["left", "center"]).default("center"),
  /** Display size of the statement. */
  size: z.enum(["lg", "xl"]).default("xl"),
});

export type StatementContent = z.infer<typeof statementSchema>;

export const makeStatement = (): StatementContent =>
  statementSchema.parse({
    text: "We build things that outlast us.",
    cite: "",
    align: "center",
    size: "xl",
  });

import { z } from "zod";
import { commonContent } from "../common";

/** Account panel — shows the signed-in reader's membership, or a sign-in CTA. */
export const accountSchema = z.object({
  ...commonContent,
});

export type AccountContent = z.infer<typeof accountSchema>;

export const makeAccount = (): AccountContent => accountSchema.parse({});

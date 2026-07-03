import type { BlockDef } from "../types";
import { makeNewsletter, newsletterSchema } from "./fields";
import { RenderNewsletter } from "./Render";

export const newsletterDef: BlockDef<typeof newsletterSchema> = {
  type: "newsletter",
  category: "newsletter",
  label: "Newsletter",
  icon: "mail",
  blurb: "An email subscribe band",
  schema: newsletterSchema,
  make: makeNewsletter,
  Render: RenderNewsletter,
};

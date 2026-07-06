import type { BlockDef } from "../types";
import { ctaButtonSchema, makeCtaButton } from "./fields";
import { RenderCtaButton } from "./Render";

export const ctaButtonDef: BlockDef<typeof ctaButtonSchema> = {
  type: "cta-button",
  category: "chrome",
  label: "CTA button",
  icon: "button",
  blurb: "Header or footer call-to-action",
  schema: ctaButtonSchema,
  make: makeCtaButton,
  Render: RenderCtaButton,
};

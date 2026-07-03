import type { BlockDef } from "../types";
import { makePaywall, paywallSchema } from "./fields";
import { RenderPaywall } from "./Render";

export const paywallDef: BlockDef<typeof paywallSchema> = {
  type: "paywall",
  category: "newsletter",
  label: "Paywall",
  icon: "lock",
  blurb: "Gate everything after this line to members",
  schema: paywallSchema,
  make: makePaywall,
  Render: RenderPaywall,
};

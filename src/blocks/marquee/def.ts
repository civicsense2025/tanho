import type { BlockDef } from "../types";
import { makeMarquee, marqueeSchema } from "./fields";
import { RenderMarquee } from "./Render";

export const marqueeDef: BlockDef<typeof marqueeSchema> = {
  type: "marquee",
  category: "media",
  label: "Marquee",
  icon: "marquee",
  blurb: "Continuously scrolling text ticker",
  schema: marqueeSchema,
  make: makeMarquee,
  Render: RenderMarquee,
};

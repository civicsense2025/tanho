import type { BlockDef } from "../types";
import { carouselSchema, makeCarousel } from "./fields";
import { RenderCarousel } from "./Render";

export const carouselDef: BlockDef<typeof carouselSchema> = {
  type: "carousel",
  category: "media",
  label: "Carousel",
  icon: "carousel",
  blurb: "Swipeable scroll-snap image strip",
  schema: carouselSchema,
  make: makeCarousel,
  Render: RenderCarousel,
};

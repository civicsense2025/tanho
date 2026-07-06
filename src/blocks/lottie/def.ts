import type { BlockDef } from "../types";
import { makeLottie, lottieSchema } from "./fields";
import { RenderLottie } from "./Render";

export const lottieDef: BlockDef<typeof lottieSchema> = {
  type: "lottie",
  category: "media",
  label: "Lottie",
  icon: "lottie",
  blurb: "Play a Lottie / JSON animation",
  schema: lottieSchema,
  make: makeLottie,
  Render: RenderLottie,
  // Optional dependency: hidden + skipped if the customer removed lottie-web.
  requiresCapability: "lottie",
};

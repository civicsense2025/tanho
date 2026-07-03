import type { BlockDef } from "../types";
import { imageSchema, makeImage } from "./fields";
import { RenderImage } from "./Render";

export const imageDef: BlockDef<typeof imageSchema> = {
  type: "image",
  category: "media",
  label: "Image",
  icon: "image",
  blurb: "Single image with caption",
  schema: imageSchema,
  make: makeImage,
  Render: RenderImage,
};

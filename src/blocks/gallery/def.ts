import type { BlockDef } from "../types";
import { gallerySchema, makeGallery } from "./fields";
import { RenderGallery } from "./Render";

export const galleryDef: BlockDef<typeof gallerySchema> = {
  type: "gallery",
  category: "media",
  label: "Gallery",
  icon: "gallery",
  blurb: "Grid of images",
  schema: gallerySchema,
  make: makeGallery,
  Render: RenderGallery,
  responsive: true,
};

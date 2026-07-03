import type { BlockDef } from "../types";
import { makeSection, sectionSchema } from "./fields";
import { RenderSection } from "./Render";

export const sectionDef: BlockDef<typeof sectionSchema> = {
  type: "section",
  category: "layout",
  label: "Section",
  icon: "layers",
  blurb: "Full-width band — background, width, spacing",
  schema: sectionSchema,
  make: makeSection,
  Render: RenderSection,
  nestable: true,
  responsive: true,
};

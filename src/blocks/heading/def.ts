import type { BlockDef } from "../types";
import { headingSchema, makeHeading } from "./fields";
import { RenderHeading } from "./Render";

export const headingDef: BlockDef<typeof headingSchema> = {
  type: "heading",
  category: "content",
  label: "Heading",
  icon: "heading",
  blurb: "Section title, H1–H4",
  schema: headingSchema,
  make: makeHeading,
  Render: RenderHeading,
};

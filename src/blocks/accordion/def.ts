import type { BlockDef } from "../types";
import { accordionSchema, makeAccordion } from "./fields";
import { RenderAccordion } from "./Render";

export const accordionDef: BlockDef<typeof accordionSchema> = {
  type: "accordion",
  category: "layout",
  label: "Accordion",
  icon: "accordion",
  blurb: "Expandable question and answer rows",
  schema: accordionSchema,
  make: makeAccordion,
  Render: RenderAccordion,
};

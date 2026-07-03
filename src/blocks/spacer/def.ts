import type { BlockDef } from "../types";
import { makeSpacer, spacerSchema } from "./fields";
import { RenderSpacer } from "./Render";

export const spacerDef: BlockDef<typeof spacerSchema> = {
  type: "spacer",
  category: "layout",
  label: "Spacer",
  icon: "spacer",
  blurb: "Fixed vertical gap",
  schema: spacerSchema,
  make: makeSpacer,
  Render: RenderSpacer,
};

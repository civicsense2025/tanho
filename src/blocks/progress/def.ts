import type { BlockDef } from "../types";
import { makeProgress, progressSchema } from "./fields";
import { RenderProgress } from "./Render";

export const progressDef: BlockDef<typeof progressSchema> = {
  type: "progress",
  category: "data",
  label: "Progress",
  icon: "progress",
  blurb: "Labelled percentage bars",
  schema: progressSchema,
  make: makeProgress,
  Render: RenderProgress,
};

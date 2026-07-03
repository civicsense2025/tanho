import type { BlockDef } from "../types";
import { makeTimeline, timelineSchema } from "./fields";
import { RenderTimeline } from "./Render";

export const timelineDef: BlockDef<typeof timelineSchema> = {
  type: "timeline",
  category: "data",
  label: "Timeline",
  icon: "timeline",
  blurb: "Vertical dated milestones",
  schema: timelineSchema,
  make: makeTimeline,
  Render: RenderTimeline,
};

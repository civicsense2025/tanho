import type { BlockDef } from "../types";
import { makeVideo, videoSchema } from "./fields";
import { RenderVideo } from "./Render";

export const videoDef: BlockDef<typeof videoSchema> = {
  type: "video",
  category: "media",
  label: "Video",
  icon: "video",
  blurb: "Self-hosted video with poster",
  schema: videoSchema,
  make: makeVideo,
  Render: RenderVideo,
};

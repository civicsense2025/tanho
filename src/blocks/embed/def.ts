import type { BlockDef } from "../types";
import { embedSchema, makeEmbed } from "./fields";
import { RenderEmbed } from "./Render";

export const embedDef: BlockDef<typeof embedSchema> = {
  type: "embed",
  category: "media",
  label: "Embed",
  icon: "embed",
  blurb: "YouTube, Vimeo, Spotify, SoundCloud, Twitter/X, Figma or Maps",
  schema: embedSchema,
  make: makeEmbed,
  Render: RenderEmbed,
};

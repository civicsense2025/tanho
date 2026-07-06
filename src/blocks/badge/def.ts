import type { BlockDef } from "../types";
import { badgeSchema, makeBadge } from "./fields";
import { RenderBadge } from "./Render";

export const badgeDef: BlockDef<typeof badgeSchema> = {
  type: "badge",
  category: "content",
  label: "Badge",
  icon: "badge",
  blurb: "Small inline label or tag pill",
  schema: badgeSchema,
  make: makeBadge,
  Render: RenderBadge,
};

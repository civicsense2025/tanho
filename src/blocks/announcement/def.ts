import type { BlockDef } from "../types";
import { announcementSchema, makeAnnouncement } from "./fields";
import { RenderAnnouncement } from "./Render";

export const announcementDef: BlockDef<typeof announcementSchema> = {
  type: "announcement",
  category: "chrome",
  label: "Announcement",
  icon: "megaphone",
  blurb: "Thin promo strip above the header",
  schema: announcementSchema,
  make: makeAnnouncement,
  Render: RenderAnnouncement,
};

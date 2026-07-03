import type { BlockDef } from "../types";
import { makeProfileHeader, profileHeaderSchema } from "./fields";
import { RenderProfileHeader } from "./Render";

export const profileHeaderDef: BlockDef<typeof profileHeaderSchema> = {
  type: "profile-header",
  category: "dynamic",
  label: "Profile header",
  icon: "user",
  blurb: "Avatar, name and bio from your profile",
  schema: profileHeaderSchema,
  make: makeProfileHeader,
  Render: RenderProfileHeader,
  bound: true,
};

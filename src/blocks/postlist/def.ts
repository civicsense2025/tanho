import type { BlockDef } from "../types";
import { makePostlist, postlistSchema } from "./fields";
import { RenderPostlist } from "./Render";

export const postlistDef: BlockDef<typeof postlistSchema> = {
  type: "postlist",
  category: "newsletter",
  label: "Post list",
  icon: "list",
  blurb: "Published posts as an archive",
  schema: postlistSchema,
  make: makePostlist,
  Render: RenderPostlist,
  bound: true,
};

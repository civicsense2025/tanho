import type { BlockDef } from "../types";
import { listSchema, makeList } from "./fields";
import { RenderList } from "./Render";

export const listDef: BlockDef<typeof listSchema> = {
  type: "list",
  category: "content",
  label: "List",
  icon: "list",
  blurb: "Bullet, numbered or check list",
  schema: listSchema,
  make: makeList,
  Render: RenderList,
};

import type { BlockDef } from "../types";
import { makeProjectList, projectListSchema } from "./fields";
import { RenderProjectList } from "./Render";

export const projectListDef: BlockDef<typeof projectListSchema> = {
  type: "project-list",
  category: "dynamic",
  label: "Project list",
  icon: "list",
  blurb: "Published projects as linked rows",
  schema: projectListSchema,
  make: makeProjectList,
  Render: RenderProjectList,
  bound: true,
};

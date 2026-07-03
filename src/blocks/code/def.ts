import type { BlockDef } from "../types";
import { codeSchema, makeCode } from "./fields";
import { RenderCode } from "./Render";

export const codeDef: BlockDef<typeof codeSchema> = {
  type: "code",
  category: "content",
  label: "Code",
  icon: "code",
  blurb: "Monospace snippet with filename bar",
  schema: codeSchema,
  make: makeCode,
  Render: RenderCode,
};

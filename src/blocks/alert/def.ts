import type { BlockDef } from "../types";
import { alertSchema, makeAlert } from "./fields";
import { RenderAlert } from "./Render";

export const alertDef: BlockDef<typeof alertSchema> = {
  type: "alert",
  category: "content",
  label: "Alert",
  icon: "alert",
  blurb: "Status banner — info, success, warning, error",
  schema: alertSchema,
  make: makeAlert,
  Render: RenderAlert,
};

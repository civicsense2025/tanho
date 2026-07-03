import type { BlockDef } from "../types";
import { buttonsSchema, makeButtons } from "./fields";
import { RenderButtons } from "./Render";

export const buttonsDef: BlockDef<typeof buttonsSchema> = {
  type: "buttons",
  category: "content",
  label: "Buttons",
  icon: "button",
  blurb: "Call-to-action link row",
  schema: buttonsSchema,
  make: makeButtons,
  Render: RenderButtons,
};

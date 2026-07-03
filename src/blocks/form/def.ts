import type { BlockDef } from "../types";
import { formBlockSchema, makeFormBlock } from "./fields";
import { RenderForm } from "./Render";

export const formDef: BlockDef<typeof formBlockSchema> = {
  type: "form",
  category: "interactive",
  label: "Form",
  icon: "clipboard",
  blurb: "Embed a published form, quiz, or signup",
  schema: formBlockSchema,
  make: makeFormBlock,
  Render: RenderForm,
  bound: true,
};

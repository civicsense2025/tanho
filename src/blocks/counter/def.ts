import type { BlockDef } from "../types";
import { makeCounter, counterSchema } from "./fields";
import { RenderCounter } from "./Render";

export const counterDef: BlockDef<typeof counterSchema> = {
  type: "counter",
  category: "data",
  label: "Counter",
  icon: "counter",
  blurb: "Number that counts up on scroll",
  schema: counterSchema,
  make: makeCounter,
  Render: RenderCounter,
};

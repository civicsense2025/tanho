import type { BlockDef } from "../types";
import { accountSchema, makeAccount } from "./fields";
import { RenderAccount } from "./Render";

export const accountDef: BlockDef<typeof accountSchema> = {
  type: "account",
  category: "newsletter",
  label: "Account",
  icon: "user",
  blurb: "The reader's membership panel",
  schema: accountSchema,
  make: makeAccount,
  Render: RenderAccount,
  bound: true,
};

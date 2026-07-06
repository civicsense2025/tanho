import type { BlockDef } from "../types";
import { makeStatement, statementSchema } from "./fields";
import { RenderStatement } from "./Render";

/** A large statement / manifesto line — for mission statements, section breaks,
 *  and pull-text bigger than a heading. */
export const statementDef: BlockDef<typeof statementSchema> = {
  type: "statement",
  category: "content",
  label: "Statement",
  icon: "quote",
  blurb: "A large statement or manifesto line",
  schema: statementSchema,
  make: makeStatement,
  Render: RenderStatement,
};

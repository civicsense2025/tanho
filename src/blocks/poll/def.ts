import type { BlockDef } from "../types";
import { makePoll, pollSchema } from "./fields";
import { RenderPoll } from "./Render";

/** A lightweight, no-backend opinion poll — click to vote, see result bars.
 *  Progressive enhancement over server-rendered option buttons; one vote per
 *  poll, remembered in localStorage. */
export const pollDef: BlockDef<typeof pollSchema> = {
  type: "poll",
  category: "interactive",
  label: "Poll",
  icon: "list",
  blurb: "A quick opinion poll — vote and see the results",
  schema: pollSchema,
  make: makePoll,
  Render: RenderPoll,
};

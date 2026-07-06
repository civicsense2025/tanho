import type { BlockDef } from "../types";
import { makeCountdown, countdownSchema } from "./fields";
import { RenderCountdown } from "./Render";

export const countdownDef: BlockDef<typeof countdownSchema> = {
  type: "countdown",
  category: "interactive",
  label: "Countdown",
  icon: "countdown",
  blurb: "Live timer to a date or deadline",
  schema: countdownSchema,
  make: makeCountdown,
  Render: RenderCountdown,
};

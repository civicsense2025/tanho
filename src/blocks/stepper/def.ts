import type { BlockDef } from "../types";
import { makeStepper, stepperSchema } from "./fields";
import { RenderStepper } from "./Render";

export const stepperDef: BlockDef<typeof stepperSchema> = {
  type: "stepper",
  category: "content",
  label: "Stepper",
  icon: "stepper",
  blurb: "Numbered steps — horizontal or vertical",
  schema: stepperSchema,
  make: makeStepper,
  Render: RenderStepper,
};

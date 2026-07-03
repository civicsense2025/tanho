import type { BlockDef } from "../types";
import { bookingSchema, makeBooking } from "./fields";
import { RenderBooking } from "./Render";

export const bookingDef: BlockDef<typeof bookingSchema> = {
  type: "booking",
  category: "interactive",
  label: "Booking",
  icon: "calendar",
  blurb: "A card that links to the scheduling flow",
  schema: bookingSchema,
  make: makeBooking,
  Render: RenderBooking,
  bound: true,
};

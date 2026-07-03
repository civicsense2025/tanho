import type { BlockDef } from "../types";
import { donationSchema, makeDonation } from "./fields";
import { RenderDonation } from "./Render";

export const donationDef: BlockDef<typeof donationSchema> = {
  type: "donation",
  category: "commerce",
  label: "Donation CTA",
  icon: "heart",
  blurb: "Static CTA card linking to the site's /donate page",
  schema: donationSchema,
  make: makeDonation,
  Render: RenderDonation,
};

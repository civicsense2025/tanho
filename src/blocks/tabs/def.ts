import type { BlockDef } from "../types";
import { makeTabs, tabsSchema } from "./fields";
import { RenderTabs } from "./Render";

export const tabsDef: BlockDef<typeof tabsSchema> = {
  type: "tabs",
  category: "content",
  label: "Tabs",
  icon: "tabs",
  blurb: "Switch between panels of content",
  schema: tabsSchema,
  make: makeTabs,
  Render: RenderTabs,
};

import type { BlockDef } from "../types";
import { navMenuSchema, makeNavMenu } from "./fields";
import { RenderNavMenu } from "./Render";

export const navMenuDef: BlockDef<typeof navMenuSchema> = {
  type: "nav-menu",
  category: "chrome",
  label: "Nav menu",
  icon: "menu",
  blurb: "Site navigation from a saved menu",
  schema: navMenuSchema,
  make: makeNavMenu,
  Render: RenderNavMenu,
  // Resolves menu items server-side (modules/menus). NOT marked `bound` — its
  // content (menuId/variant/mobileStyle) must stay editable in the inspector;
  // uses the `table`-style pattern (resolver registered, def stays static).
};

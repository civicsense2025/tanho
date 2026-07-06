import type { BlockDef } from "../types";
import { logoSchema, makeLogo } from "./fields";
import { RenderLogo } from "./Render";

export const logoDef: BlockDef<typeof logoSchema> = {
  type: "logo",
  category: "chrome",
  label: "Logo",
  icon: "square",
  blurb: "Site mark, wordmark, or icon",
  schema: logoSchema,
  make: makeLogo,
  Render: RenderLogo,
  // Resolves the site name for the white-label fallback (empty text). NOT marked
  // `bound` — its content (text/style/icon) must stay editable in the inspector;
  // it uses the `table`-style pattern (resolver registered, def stays static).
};

/**
 * Six starter palettes for the Brand editor's one-click preset row. Each is
 * just the four base colors; clicking one fills those fields and the rest of
 * the theme (type/spacing) is left as-is. Brand-neutral — no real brand hexes.
 */
export type PalettePreset = {
  id: string;
  name: string;
  accent: string;
  accent2: string;
  ink: string;
  paper: string;
};

export const PALETTE_PRESETS: PalettePreset[] = [
  { id: "warm", name: "Warm clay", accent: "#6e2b32", accent2: "#585c34", ink: "#1c1a16", paper: "#fdfcf9" },
  { id: "indigo", name: "Indigo", accent: "#3b5bdb", accent2: "#0ca678", ink: "#14161a", paper: "#ffffff" },
  { id: "forest", name: "Forest", accent: "#2f6b3f", accent2: "#a1662f", ink: "#161a15", paper: "#fbfdf9" },
  { id: "plum", name: "Plum", accent: "#7048a8", accent2: "#c2255c", ink: "#191320", paper: "#fdfbff" },
  { id: "slate", name: "Slate", accent: "#334155", accent2: "#0891b2", ink: "#0f172a", paper: "#ffffff" },
  { id: "coral", name: "Coral", accent: "#e2652f", accent2: "#7c9473", ink: "#231f1c", paper: "#fdf8f2" },
];

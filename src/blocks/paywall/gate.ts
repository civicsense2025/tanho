import type { RenderViewer } from "../types";
import type { PaywallContent } from "./fields";

/**
 * Does this viewer pass the paywall? The ONE place gate policy lives, shared
 * by the walker and any future per-block visibility. Anonymous never passes;
 * an empty `tier` requires any active membership; a named tier requires that
 * exact tier (active).
 */
export function viewerPassesPaywall(
  viewer: RenderViewer,
  content: PaywallContent,
): boolean {
  if (!viewer || !viewer.memberActive) return false;
  if (!content.tier) return true;
  return viewer.tier === content.tier;
}

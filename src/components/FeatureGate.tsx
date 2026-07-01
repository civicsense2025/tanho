import { getSettings } from "@/lib/settings";
import type { SiteFeatures } from "@/config/site.config";
import type { ReactNode } from "react";

/**
 * Runtime feature gate. Renders `children` only when the named feature is enabled in
 * /admin/settings (the owner toggles it live, no rebuild). When off, nothing renders and — for a
 * *client* child that the parent lazy-loads (see below) — its bundle never ships.
 *
 * TWO levels of "don't run disabled-feature code", by design (a single-deploy app can't fully
 * un-bundle server code at runtime, but it can avoid executing it AND avoid shipping its client JS):
 *
 *  1. Execution gating (this component + the route-level `getSettings()` 404s): a disabled
 *     feature's logic never runs.
 *  2. Client-bundle gating: wrap the feature's client component in `next/dynamic` and render it
 *     ONLY inside a FeatureGate, so React never loads that chunk in the browser while the feature
 *     is off. Example:
 *
 *       import dynamic from "next/dynamic";
 *       const BuyButton = dynamic(() => import("@/components/BuyButton").then(m => m.BuyButton));
 *       // ...
 *       <FeatureGate feature="payments"><BuyButton kind="subscription" priceId={id} /></FeatureGate>
 *
 *     Because the <FeatureGate> returns null when payments are off, the dynamic import is never
 *     triggered, so the BuyButton chunk isn't fetched — the disabled feature costs zero client JS
 *     until the owner turns it back on.
 */
export async function FeatureGate({
  feature,
  children,
  fallback = null,
}: {
  feature: keyof SiteFeatures;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const settings = await getSettings();
  return settings.features[feature] ? <>{children}</> : <>{fallback}</>;
}

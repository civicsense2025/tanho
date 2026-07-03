import { cacheLife, cacheTag } from "next/cache";
import { getMarketplaceSettings } from "./queries";
import { fetchAllPeerCatalogs, type PeerPackSummary } from "./federation";

/** One peer's contribution to the federated browse list. */
export type FederatedPeer = {
  peerUrl: string;
  peerName: string;
  packs: PeerPackSummary[];
  /** Present when the peer catalog could not be fetched. */
  error?: string;
};

/**
 * The unified, browseable federated catalog. Reads the marketplace settings,
 * fetches every peer's catalog.json in parallel, and merges them into a list
 * keyed by peer URL. Failed peers are included with an empty pack list and an
 * `error` flag so the UI can surface them. Cached briefly ("minutes") and
 * tagged `federated-catalog` (refreshable via `refreshFederatedCatalog()`)
 * plus `marketplace` so saving peer-instance settings also busts it.
 */
export async function getFederatedCatalog(): Promise<FederatedPeer[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("federated-catalog", "marketplace");

  const settings = await getMarketplaceSettings();
  const peerUrls = settings.peerInstances;
  if (peerUrls.length === 0) return [];

  const results = await fetchAllPeerCatalogs(peerUrls);
  return results.map(({ peerUrl, result }) => {
    if (!result.ok) {
      return { peerUrl, peerName: peerUrl, packs: [], error: result.error };
    }
    return {
      peerUrl,
      peerName: result.catalog.name || peerUrl,
      packs: result.catalog.packs,
    };
  });
}

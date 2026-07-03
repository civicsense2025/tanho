/**
 * Federation — fetching catalogs and packs from peer platform instances.
 *
 * Every function here is fail-soft: network errors, non-200 responses, bad
 * JSON, and wrong format tags all return `{ ok: false, error }` rather than
 * throwing. Callers (the federated browse screen, the install action) can
 * render peer failures inline without try/catch gymnastics.
 */

/** A single pack entry inside a peer's catalog.json. */
export type PeerPackSummary = {
  type: string;
  slug: string;
  title: string;
  description: string;
  downloadUrl: string;
  requiredBlockTypes: string[];
};

/** Shape of `{peerUrl}/marketplace/catalog.json`. */
export type PeerCatalog = {
  format: string;
  name: string;
  description: string;
  packs: PeerPackSummary[];
};

const FETCH_TIMEOUT_MS = 10_000;
const CATALOG_FORMAT = "oys-marketplace@1";

/** Strip a trailing slash so we can concatenate path segments cleanly. */
function joinUrl(peerUrl: string, path: string): string {
  return `${peerUrl.replace(/\/+$/, "")}${path}`;
}

/** Run a fetch with a 10s abort timeout; never throws. */
async function fetchWithTimeout(
  url: string,
): Promise<{ ok: true; res: Response } | { ok: false; error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    return { ok: true, res };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch a peer instance's catalog.json. Validates the `format` tag is
 * `oys-marketplace@1` and that `packs` is an array of the expected shape.
 * Returns the parsed catalog or a graceful error — never throws.
 */
export async function fetchPeerCatalog(
  peerUrl: string,
): Promise<{ ok: true; catalog: PeerCatalog } | { ok: false; error: string }> {
  const url = joinUrl(peerUrl, "/marketplace/catalog.json");
  const fetched = await fetchWithTimeout(url);
  if (!fetched.ok) return { ok: false, error: fetched.error };
  const { res } = fetched;
  if (!res.ok) return { ok: false, error: `Peer responded ${res.status}` };

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }

  if (!body || typeof body !== "object") return { ok: false, error: "Invalid catalog" };
  const obj = body as Record<string, unknown>;
  if (obj.format !== CATALOG_FORMAT) {
    return { ok: false, error: `Unsupported catalog format (expected ${CATALOG_FORMAT})` };
  }
  const name = typeof obj.name === "string" ? obj.name : "";
  const description = typeof obj.description === "string" ? obj.description : "";
  const rawPacks = Array.isArray(obj.packs) ? obj.packs : [];
  const packs: PeerPackSummary[] = [];
  for (const p of rawPacks) {
    if (!p || typeof p !== "object") continue;
    const pk = p as Record<string, unknown>;
    if (typeof pk.type !== "string" || typeof pk.slug !== "string") continue;
    packs.push({
      type: pk.type,
      slug: pk.slug,
      title: typeof pk.title === "string" ? pk.title : pk.slug,
      description: typeof pk.description === "string" ? pk.description : "",
      downloadUrl: typeof pk.downloadUrl === "string" ? pk.downloadUrl : "",
      requiredBlockTypes: Array.isArray(pk.requiredBlockTypes)
        ? (pk.requiredBlockTypes as unknown[]).filter((x): x is string => typeof x === "string")
        : [],
    });
  }

  return { ok: true, catalog: { format: CATALOG_FORMAT, name, description, packs } };
}

/**
 * Fetch a single pack's portable JSON from a peer. Returns the raw parsed
 * JSON (the `oys-pack@1` object) for the importer to validate. Never throws.
 */
export async function fetchPeerPack(
  peerUrl: string,
  type: string,
  slug: string,
): Promise<{ ok: true; pack: unknown } | { ok: false; error: string }> {
  const url = joinUrl(peerUrl, `/marketplace/${encodeURIComponent(type)}/${encodeURIComponent(slug)}/download`);
  const fetched = await fetchWithTimeout(url);
  if (!fetched.ok) return { ok: false, error: fetched.error };
  const { res } = fetched;
  if (!res.ok) return { ok: false, error: `Peer responded ${res.status}` };

  try {
    const pack = await res.json();
    return { ok: true, pack };
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
}

/**
 * Fetch every peer's catalog in parallel. Each peer's result is keyed by its
 * URL; a failed peer yields `{ ok: false, error }` and never rejects the
 * whole batch.
 */
export async function fetchAllPeerCatalogs(
  peerUrls: string[],
): Promise<Array<{ peerUrl: string; result: Awaited<ReturnType<typeof fetchPeerCatalog>> }>> {
  const results = await Promise.all(
    peerUrls.map(async (peerUrl) => ({
      peerUrl,
      result: await fetchPeerCatalog(peerUrl),
    })),
  );
  return results;
}

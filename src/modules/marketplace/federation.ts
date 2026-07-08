import { hostnameResolvesToBlockedIp, isLoopbackOrLinkLocalIp, isPrivateRangeIp } from "@/lib/ssrf-guard";

/**
 * Federation — fetching catalogs and packs from peer platform instances.
 *
 * Every function here is fail-soft: network errors, non-200 responses, bad
 * JSON, and wrong format tags all return `{ ok: false, error }` rather than
 * throwing. Callers (the federated browse screen, the install action) can
 * render peer failures inline without try/catch gymnastics.
 *
 * SSRF guard: peerUrl must be in the caller-supplied allowlist (the owner's
 * settings.peerInstances) AND must not resolve to a loopback/link-local/
 * private-range address — a peer is a third-party server, not the owner's
 * own infrastructure, so (unlike data-sources) private ranges are blocked
 * too, closing both "peerUrl isn't configured at all" and "an allowlisted
 * hostname resolves somewhere it shouldn't (DNS rebinding)".
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
const CATALOG_FORMAT = "lamina-marketplace@1";

/** Strip a trailing slash so we can concatenate path segments cleanly. */
function joinUrl(peerUrl: string, path: string): string {
  return `${peerUrl.replace(/\/+$/, "")}${path}`;
}

/**
 * Rejects a peer URL that isn't https, isn't in the owner's configured
 * allowlist, or resolves to a loopback/link-local/private-range address.
 * Called immediately before every outbound fetch (not just once at the
 * call site) so a TOCTOU DNS change between validation and fetch can't slip
 * through — the resolved-address check happens right here, right before use.
 */
async function assertSafePeerUrl(
  url: string,
  allowedPeerUrls: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "Invalid peer URL" };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Peer URL must use https" };
  }
  const normalized = url.replace(/\/+$/, "");
  if (!allowedPeerUrls.some((p) => p.replace(/\/+$/, "") === normalized)) {
    return { ok: false, error: "Peer URL is not in the configured peer instances list" };
  }
  const blocked = await hostnameResolvesToBlockedIp(
    parsed.hostname,
    (ip) => isLoopbackOrLinkLocalIp(ip) || isPrivateRangeIp(ip),
  );
  if (blocked) {
    return { ok: false, error: "Peer URL resolves to a disallowed address" };
  }
  return { ok: true };
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
      redirect: "error", // a redirect to a disallowed host would bypass assertSafePeerUrl's one-time check
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
 * `lamina-marketplace@1` and that `packs` is an array of the expected shape.
 * Returns the parsed catalog or a graceful error — never throws.
 */
export async function fetchPeerCatalog(
  peerUrl: string,
  allowedPeerUrls: string[],
): Promise<{ ok: true; catalog: PeerCatalog } | { ok: false; error: string }> {
  const safe = await assertSafePeerUrl(peerUrl, allowedPeerUrls);
  if (!safe.ok) return safe;
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
 * JSON (the `lamina-pack@1` object) for the importer to validate. Never throws.
 */
export async function fetchPeerPack(
  peerUrl: string,
  type: string,
  slug: string,
  allowedPeerUrls: string[],
): Promise<{ ok: true; pack: unknown } | { ok: false; error: string }> {
  const safe = await assertSafePeerUrl(peerUrl, allowedPeerUrls);
  if (!safe.ok) return safe;
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
      result: await fetchPeerCatalog(peerUrl, peerUrls),
    })),
  );
  return results;
}

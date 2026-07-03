"use server";

import { updateTag } from "next/cache";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { fetchPeerPack } from "./federation";
import { importBlockPack } from "@/modules/blocks/packs/actions";
import { importDesignPack } from "@/modules/blocks/design-packs/actions";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

export type InstallDiagnostics = {
  id: string;
  missingTypes: string[];
  dropped: string[];
};

/**
 * Install a pack from a peer instance. Fetches the portable pack JSON from
 * `{peerUrl}/marketplace/{type}/{slug}/download`, then imports it via the
 * appropriate importer with `source: "marketplace"` and `origin: peerUrl`.
 * Owner-gated (design-pack imports require owner; gating the whole action
 * keeps the contract uniform). Returns the import diagnostics (missing block
 * types, dropped blocks) so the UI can surface them.
 */
export async function installPackFromPeer(
  peerUrl: string,
  type: string,
  slug: string,
): Promise<Result<InstallDiagnostics>> {
  const user = await requireUser("owner");

  const fetched = await fetchPeerPack(peerUrl, type, slug);
  if (!fetched.ok) return { ok: false, error: fetched.error };
  const pack = fetched.pack;

  const result =
    type === "design-pack"
      ? await importDesignPack(pack, "marketplace", peerUrl)
      : await importBlockPack(pack, "marketplace", peerUrl);

  if (!result.ok) return { ok: false, error: result.error };
  const d = result.data!;

  await writeAudit({
    userId: user.id,
    action: "marketplace.install",
    ownerType: "marketplace",
    ownerId: `${peerUrl}:${type}:${slug}`,
    meta: { type, slug, origin: peerUrl, missingTypes: d.missingTypes },
  });

  return {
    ok: true,
    data: { id: d.id, missingTypes: d.missingTypes, dropped: d.dropped },
  };
}

/**
 * Force-refresh the cached federated catalog (read-your-own-writes after the
 * owner edits peer instances or a peer publishes new packs). Any logged-in
 * user may refresh.
 */
export async function refreshFederatedCatalog(): Promise<Result> {
  await requireUser();
  updateTag("federated-catalog");
  return { ok: true };
}

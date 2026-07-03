"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { getViewer } from "@/modules/people/viewer";
import { getAdminUser } from "@/modules/auth/session";
import { people } from "@/modules/people/schema";
import { entries } from "@/modules/entries/schema";
import { serializeBlockPack } from "@/modules/blocks/packs/actions";
import { serializeDesignPack } from "@/modules/blocks/design-packs/actions";
import { importBlockPack } from "@/modules/blocks/packs/actions";
import { importDesignPack } from "@/modules/blocks/design-packs/actions";
import { urlTypeForEntryType } from "./public";
import { hasPackEntitlement } from "./entitlements";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

type PackType = "block_pack" | "design_pack";

function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Resolve the current buyer's personId. Tries the public viewer (storefront
 * buyer with a person_session cookie) first, then falls back to matching the
 * admin user's email to a CRM person record. Returns null when no identity
 * can be established.
 */
async function resolveBuyerPersonId(): Promise<string | null> {
  const viewer = await getViewer();
  if (viewer) return viewer.personId;

  const admin = await getAdminUser();
  if (!admin) return null;
  const person = await db.query.people.findFirst({ where: eq(people.email, admin.email) });
  return person?.id ?? null;
}

/**
 * Download an entitled pack as portable JSON. For logged-in buyers with an
 * entitlement (storefront viewer or admin whose email matches a person).
 * Returns the serialized pack object.
 */
export async function downloadEntitledPack(
  packType: PackType,
  packEntryId: string,
): Promise<Result<unknown>> {
  const personId = await resolveBuyerPersonId();
  if (!personId) return { ok: false, error: "You must be logged in to download your purchases." };

  const entitled = await hasPackEntitlement(personId, packType, packEntryId);
  if (!entitled) return { ok: false, error: "You don't have access to this pack." };

  const result =
    packType === "block_pack"
      ? await serializeBlockPack(packEntryId)
      : await serializeDesignPack(packEntryId);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

export type InstallDiagnostics = {
  id: string;
  missingTypes: string[];
  dropped: string[];
  pages?: number;
};

/**
 * Install an entitled pack into this instance. Imports the pack via the
 * standard import flow with source "marketplace" and the marketplace download
 * URL as the origin. Requires admin auth (the import functions gate on it).
 * The buyer's entitlement is checked against the admin user's matching person
 * record.
 */
export async function installEntitledPack(
  packType: PackType,
  packEntryId: string,
): Promise<Result<InstallDiagnostics>> {
  // Import functions require admin auth — verify it here for a clear error
  // before delegating (which would redirect to /admin/login).
  const admin = await getAdminUser();
  if (!admin) return { ok: false, error: "Admin login required to install a pack." };

  const personId = await resolveBuyerPersonId();
  if (!personId) return { ok: false, error: "No matching person record for your account." };

  const entitled = await hasPackEntitlement(personId, packType, packEntryId);
  if (!entitled) return { ok: false, error: "You don't have access to this pack." };

  // Serialize the pack from the source entry, then re-import it.
  const serialized =
    packType === "block_pack"
      ? await serializeBlockPack(packEntryId)
      : await serializeDesignPack(packEntryId);
  if (!serialized.ok) return { ok: false, error: serialized.error };

  // Build the marketplace origin URL for provenance.
  const entry = await db.query.entries.findFirst({ where: eq(entries.id, packEntryId) });
  const urlType = entry ? urlTypeForEntryType(entry.type) : null;
  const origin =
    entry && urlType
      ? `${appUrl()}/marketplace/${urlType}/${entry.slug}/download`
      : "";

  if (packType === "block_pack") {
    const res = await importBlockPack(serialized.data, "marketplace", origin);
    if (!res.ok) return { ok: false, error: res.error };
    return {
      ok: true,
      data: {
        id: res.data!.id,
        missingTypes: res.data!.missingTypes,
        dropped: res.data!.dropped,
      },
    };
  }

  const res = await importDesignPack(serialized.data, "marketplace", origin);
  if (!res.ok) return { ok: false, error: res.error };
  return {
    ok: true,
    data: {
      id: res.data!.id,
      missingTypes: res.data!.missingTypes,
      dropped: res.data!.dropped,
      pages: res.data!.pages,
    },
  };
}

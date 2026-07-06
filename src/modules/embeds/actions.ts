"use server";

import { requireUser } from "@/modules/auth/guards";
import { resolveEmbedUrl, type ResolveEmbedResult } from "./resolve";

/**
 * Server Action wrapper around resolveEmbedUrl — the resolver itself does
 * real outbound network I/O (SoundCloud's oEmbed call), so it can't run
 * directly in a client component. Admin-only, same as every other
 * editor-facing action; read-only (no DB write), so no role restriction
 * beyond "is a logged-in admin".
 */
export async function resolveEmbedUrlAction(shareUrl: string): Promise<ResolveEmbedResult> {
  await requireUser();
  return resolveEmbedUrl(shareUrl);
}

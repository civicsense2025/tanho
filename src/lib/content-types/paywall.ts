import { cookies } from "next/headers";
import type { ContentEntry, ContentType } from "@/lib/db";
import { verifyPostAccess, ACCESS_COOKIE_NAME } from "@/lib/stripe/entitlement";

/**
 * Redacts a paid post's body from a ContentEntry before it leaves the generic content-entries
 * API, mirroring the gating already done correctly in src/app/posts/[slug]/page.tsx. The generic
 * API has no per-content-type entitlement model (that's real future work -- see the plan's own
 * note on this), so this is scoped narrowly: only entries of the "post" content type with
 * data.visibility === "paid" are checked, so a custom type that happens to have an unrelated
 * "visibility" field is never falsely redacted.
 */
export async function redactPaidEntry(entry: ContentEntry, type: ContentType | undefined): Promise<ContentEntry> {
  if (type?.slug !== "post") return entry;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(entry.data) as Record<string, unknown>;
  } catch {
    return entry;
  }
  if (data.visibility !== "paid") return entry;

  const token = (await cookies()).get(ACCESS_COOKIE_NAME)?.value;
  if (await verifyPostAccess(token)) return entry;

  const { body: _body, ...redacted } = data;
  void _body;
  return { ...entry, data: JSON.stringify(redacted) };
}

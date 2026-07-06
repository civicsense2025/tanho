import { requireOwnerSessionOrToken } from "@/modules/auth/admin-or-token";
import { authErrorResponse } from "@/modules/auth/admin-or-token-response";
import { writeAudit } from "@/modules/audit/log";
import { parseExportArchive } from "@/modules/portability/archive";
import { applySiteImport } from "@/modules/portability/import";

/**
 * Whole-site import — owner-only, DESTRUCTIVE. Accepts a .tar.gz bundle (the
 * counterpart to /api/admin/export) as the raw request body
 * (Content-Type: application/gzip, body = the file bytes) and upserts every
 * allowlisted table by natural key, restoring media files. Idempotent.
 *
 * `?people=1` (the default) applies the PII-bearing people tables when the
 * bundle contains them — the bundle itself is the opt-in, so this only ever
 * matters for a bundle that was exported with people included.
 *
 * Route handlers access the DB + filesystem directly here — no "use cache"
 * involved, this is always a request-time, non-cached response. Mirrors the
 * export route: raw `Response`, owner-only, under /api/admin/. Owner auth
 * accepts EITHER an API bearer token (native app) or the admin session cookie
 * (browser) — see requireOwnerSessionOrToken.
 */
export async function POST(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireOwnerSessionOrToken();
  } catch (e) {
    return authErrorResponse(e);
  }

  const includePeople = new URL(request.url).searchParams.get("people") !== "0";

  // Cap the compressed upload well above any realistic site backup. Bounds the
  // memory a single request can force us to buffer + gunzip (a maliciously
  // crafted or accidental huge .gz would otherwise decompress unbounded into
  // memory — only an owner can reach here, but this keeps them from OOMing
  // their own instance). 413 = payload too large.
  const MAX_IMPORT_BYTES = 100 * 1024 * 1024;
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_IMPORT_BYTES) {
    return Response.json({ ok: false, error: "Backup file is too large (max 100 MB)" }, { status: 413 });
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength === 0) {
    return Response.json({ ok: false, error: "Empty request body" }, { status: 400 });
  }
  if (bytes.byteLength > MAX_IMPORT_BYTES) {
    return Response.json({ ok: false, error: "Backup file is too large (max 100 MB)" }, { status: 413 });
  }

  let parsed: ReturnType<typeof parseExportArchive>;
  try {
    parsed = parseExportArchive(bytes);
  } catch (err) {
    // Malformed archive (bad gzip, missing content.json, corrupt tar) — a
    // client input problem, not a server fault, so 400 rather than 500.
    const message = err instanceof Error ? err.message : "Malformed archive";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }

  const result = await applySiteImport(parsed.content, parsed.files, { includePeople });

  await writeAudit({
    userId: user.id,
    action: "site.import",
    meta: {
      ok: result.ok,
      includePeople,
      ...(result.ok ? { counts: result.counts } : { error: result.error }),
    },
  });

  // A failed import is a validation failure of the supplied bundle (unknown
  // format, a row missing its natural key), not a server error → 400.
  return Response.json(result, { status: result.ok ? 200 : 400 });
}

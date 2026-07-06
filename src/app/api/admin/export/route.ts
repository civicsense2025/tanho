import { requireOwnerSessionOrToken } from "@/modules/auth/admin-or-token";
import { authErrorResponse } from "@/modules/auth/admin-or-token-response";
import { buildExportArchive } from "@/modules/portability/archive";
import { buildSiteExport } from "@/modules/portability/export";

/**
 * Whole-site export — owner-only. Streams a downloadable .tar.gz containing
 * manifest.json, content.json (every allowlisted table), and uploads/<key>
 * for each media file. `?people=1` additionally includes the PII-bearing
 * people tables (see modules/portability/manifest.ts for the allowlist and
 * why the rest is excluded).
 *
 * Owner auth accepts EITHER an API bearer token (native app) or the admin
 * session cookie (browser download) — see requireOwnerSessionOrToken.
 *
 * Route handlers access the DB + filesystem directly here — no "use cache"
 * involved, this is always a request-time, non-cached response.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireOwnerSessionOrToken();
  } catch (e) {
    return authErrorResponse(e);
  }

  const includePeople = new URL(request.url).searchParams.get("people") === "1";
  const now = Date.now();

  const { contentJson, files } = await buildSiteExport({ includePeople, now });
  const archive = buildExportArchive(contentJson, files);

  return new Response(new Uint8Array(archive), {
    status: 200,
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="site-export-${now}.tar.gz"`,
      "Content-Length": String(archive.byteLength),
    },
  });
}

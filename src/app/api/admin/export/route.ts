import { requireUser } from "@/modules/auth/guards";
import { buildExportArchive } from "@/modules/portability/archive";
import { buildSiteExport } from "@/modules/portability/export";

/**
 * Whole-site export — owner-only. Streams a downloadable .tar.gz containing
 * manifest.json, content.json (every allowlisted table), and uploads/<key>
 * for each media file. `?people=1` additionally includes the PII-bearing
 * people tables (see modules/portability/manifest.ts for the allowlist and
 * why the rest is excluded).
 *
 * Route handlers access the DB + filesystem directly here — no "use cache"
 * involved, this is always a request-time, non-cached response.
 */
export async function GET(request: Request): Promise<Response> {
  await requireUser("owner");

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

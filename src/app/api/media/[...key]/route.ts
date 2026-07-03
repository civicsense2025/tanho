import { storage } from "@/adapters/storage";

/**
 * Public media file serving. Published pages embed these URLs, so the
 * route is intentionally unauthenticated — keys are unguessable cuid2s
 * and the key grammar is enforced before storage is consulted.
 */
const KEY_RE = /^[a-z0-9]+\.[a-z0-9]{2,5}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
): Promise<Response> {
  const { key } = await params;
  if (!Array.isArray(key) || key.length !== 1 || !KEY_RE.test(key[0])) {
    return new Response("Not found", { status: 404 });
  }
  const file = await storage.read(key[0]);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.data.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

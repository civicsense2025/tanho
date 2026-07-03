import { createId } from "@paralleldrive/cuid2";
import { storage } from "@/adapters/storage";
import { matchesSignature } from "@/modules/media/signature";
import { sanitizeFilename } from "@/modules/media/validation";
import {
  FORM_UPLOAD_MAX_BYTES,
  FORM_UPLOAD_MIME_TO_EXT,
  FORM_UPLOAD_PREFIX,
} from "@/modules/forms/upload-validation";
import { allowUpload } from "@/modules/forms/upload-rate-limit";

/**
 * Public, anonymous file upload for form "file"/"signature" fields. NOT the
 * admin media pipeline (that's requireUser-gated) — this is a deliberately
 * small, hardened, PUBLIC surface: closed MIME allowlist, magic-byte check,
 * server-generated key, size cap, light per-IP rate limit. Bad input always
 * gets a 400 with a clear message; it never throws a 500.
 */
export async function POST(request: Request): Promise<Response> {
  const ip = (request.headers.get("x-forwarded-for") ?? "local").split(",")[0]!.trim();
  if (!allowUpload(ip)) {
    return json({ error: "Too many uploads. Try again in a minute." }, 400);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: "Invalid upload." }, 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return json({ error: "No file provided." }, 400);
  if (file.size === 0) return json({ error: "File is empty." }, 400);
  if (file.size > FORM_UPLOAD_MAX_BYTES) {
    return json({ error: "File is larger than 10MB." }, 400);
  }

  // The extension always comes from the allowlist, never the client filename.
  const ext = FORM_UPLOAD_MIME_TO_EXT[file.type];
  if (!ext) return json({ error: "Unsupported file type." }, 400);

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return json({ error: "Could not read file." }, 400);
  }

  if (!matchesSignature(file.type, bytes)) {
    return json({ error: "File content does not match its type." }, 400);
  }

  const key = `${FORM_UPLOAD_PREFIX}${createId()}.${ext}`;
  try {
    await storage.put(key, bytes, file.type);
  } catch {
    return json({ error: "Could not store file." }, 400);
  }

  return json({ key, name: sanitizeFilename(file.name), url: storage.publicUrl(key) }, 200);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

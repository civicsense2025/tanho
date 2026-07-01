import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

/** Matches src/lib/content/store.ts: Vercel's serverless filesystem is
 * read-only outside /tmp in production, so uploads go to Vercel Blob there
 * instead of the local public/uploads/ directory. */
function isWritableFsEnvironment(): boolean {
  return process.env.CONTENT_PROVIDER === "fs" || process.env.NODE_ENV !== "production";
}

export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  const ext = file.name.split(".").pop() || "bin";
  const name = `${randomUUID()}.${ext}`;

  if (isWritableFsEnvironment()) {
    await mkdir(UPLOADS_DIR, { recursive: true });
    await writeFile(path.join(UPLOADS_DIR, name), new Uint8Array(await file.arrayBuffer()));
    return NextResponse.json({ url: `/uploads/${name}` });
  }

  const blob = await put(name, file, { access: "public", addRandomSuffix: false });
  return NextResponse.json({ url: blob.url });
}

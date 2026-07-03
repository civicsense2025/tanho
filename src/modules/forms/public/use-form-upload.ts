"use client";

import { useState } from "react";

export type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "done"; key: string; name: string }
  | { status: "error"; message: string };

/**
 * Shared client-side uploader for form "file" and "signature" fields. Posts
 * to the public, hardened /api/forms/upload route and tracks status so the
 * field control can render uploading/success/error. The returned key is what
 * gets written into the field's hidden input — the server re-validates it
 * against the same key grammar before ever trusting it (submission-schema.ts).
 */
export function useFormUpload() {
  const [state, setState] = useState<UploadState>({ status: "idle" });

  async function upload(file: File): Promise<string | null> {
    setState({ status: "uploading" });
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/forms/upload", { method: "POST", body });
      const data = (await res.json().catch(() => null)) as
        | { key: string; name: string }
        | { error: string }
        | null;
      if (!res.ok || !data || "error" in data) {
        const message = data && "error" in data ? data.error : "Upload failed.";
        setState({ status: "error", message });
        return null;
      }
      setState({ status: "done", key: data.key, name: data.name });
      return data.key;
    } catch {
      setState({ status: "error", message: "Upload failed. Check your connection." });
      return null;
    }
  }

  return { state, upload, reset: () => setState({ status: "idle" }) };
}

"use client";

import { useState } from "react";
import { Input } from "@/components/forms/Input";
import { FORM_UPLOAD_ACCEPT } from "../upload-validation";
import { useFormUpload } from "./use-form-upload";
import styles from "./form.module.css";

/**
 * Real file input for the "file" field. Uploads through the public, hardened
 * /api/forms/upload route on change; the returned storage key (never the raw
 * file) is what submits with the form, via a hidden input.
 */
export function FileUploadField({ id, required }: { id: string; required: boolean }) {
  const { state, upload } = useFormUpload();
  const [key, setKey] = useState("");

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploaded = await upload(file);
    setKey(uploaded ?? "");
  }

  return (
    <div className={styles.uploadRow}>
      <input type="hidden" name={id} value={key} />
      <Input
        type="file"
        accept={FORM_UPLOAD_ACCEPT}
        onChange={onChange}
        required={required && !key}
      />
      {state.status === "uploading" ? <span className={styles.uploadStatus}>Uploading…</span> : null}
      {state.status === "done" ? (
        <span className={styles.uploadStatus}>Uploaded ✓ {state.name}</span>
      ) : null}
      {state.status === "error" ? <span className={styles.uploadError}>{state.message}</span> : null}
    </div>
  );
}

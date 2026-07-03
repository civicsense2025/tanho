"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/core/Button";
import { Input } from "@/components/forms/Input";
import { useFormUpload } from "./use-form-upload";
import styles from "./form.module.css";

/**
 * Draw-to-sign canvas for the "signature" field. Pointer events (mouse,
 * touch, pen) draw on an HTML canvas — no signature library, per the
 * white-label constraint. On stroke-end the canvas is exported to a PNG blob
 * and uploaded through the same public /api/forms/upload route used by file
 * fields; the returned storage key is written into the hidden input that
 * submits with the form. A "type your name instead" fallback stores
 * `typed:{name}` — validated server-side in submission-schema.ts.
 */
export function SignaturePad({
  id,
  required,
}: {
  id: string;
  required: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasStroke = useRef(false);
  const [mode, setMode] = useState<"draw" | "typed">("draw");
  const [typedName, setTypedName] = useState("");
  const [value, setValue] = useState("");
  const { state, upload } = useFormUpload();

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    hasStroke.current = true;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  async function onPointerUp() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas || !hasStroke.current) return;
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) return;
    const file = new File([blob], "signature.png", { type: "image/png" });
    const key = await upload(file);
    if (key) setValue(key);
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStroke.current = false;
    setValue("");
  }

  function useTyped() {
    setMode("typed");
    clear();
  }

  function useDraw() {
    setMode("draw");
    setTypedName("");
    setValue("");
  }

  const typedValue = typedName.trim() ? `typed:${typedName.trim()}` : "";

  return (
    <div className={styles.signatureFallback}>
      <input type="hidden" name={id} value={mode === "typed" ? typedValue : value} />
      {mode === "draw" ? (
        <>
          <canvas
            ref={canvasRef}
            width={480}
            height={160}
            className={styles.signaturePad}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            aria-label="Draw your signature"
          />
          <div className={styles.signatureRow}>
            <Button type="button" variant="ghost" size="sm" onClick={clear}>
              Clear
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={useTyped}>
              Or type your name
            </Button>
            {state.status === "uploading" ? (
              <span className={styles.uploadStatus}>Saving signature…</span>
            ) : null}
            {state.status === "done" ? (
              <span className={styles.uploadStatus}>Signed ✓</span>
            ) : null}
            {state.status === "error" ? (
              <span className={styles.uploadError}>{state.message}</span>
            ) : null}
          </div>
        </>
      ) : (
        <div className={styles.signatureRow}>
          <Input
            placeholder="Type your full name to sign"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            required={required}
          />
          <Button type="button" variant="ghost" size="sm" onClick={useDraw}>
            Draw instead
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/core/Button";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Section, Row } from "@/components/admin/Section";
import {
  createFamilyFromFaces,
  importFontZip,
  uploadFontFiles,
  type FamilyWithFaces,
  type StagedFace,
} from "../actions";
import { WEIGHT_LABELS } from "./weights";
import styles from "./fonts.module.css";

/** A staged face + the user-editable family/weight/style for the match table. */
type MatchRow = StagedFace & { family: string; weight: number; style: "normal" | "italic" };

/** Upload font files/folder/zip → detect metadata → confirm families. */
export function UploadTab({ onCreated }: { onCreated: (fam: FamilyWithFaces) => void }) {
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const stage = (staged: StagedFace[]) => {
    setRows((prev) => [
      ...prev,
      ...staged.map((s) => ({
        ...s,
        family: s.meta?.familyName ?? "",
        weight: s.meta?.weight ?? 400,
        style: s.meta?.style ?? ("normal" as const),
      })),
    ]);
  };

  const handleFiles = async (files: File[]) => {
    setErr(null);
    setBusy(true);
    try {
      const zips = files.filter((f) => f.name.toLowerCase().endsWith(".zip"));
      const fonts = files.filter((f) => /\.(woff2|woff|ttf|otf)$/i.test(f.name));
      for (const zip of zips) {
        const fd = new FormData();
        fd.append("file", zip);
        const res = await importFontZip(fd);
        if (res.ok) stage(res.data ?? []);
        else setErr(res.error);
      }
      if (fonts.length > 0) {
        const fd = new FormData();
        fonts.forEach((f) => fd.append("files", f));
        const res = await uploadFontFiles(fd);
        if (res.ok) stage(res.data ?? []);
        else setErr(res.error);
      }
      if (zips.length === 0 && fonts.length === 0) setErr("Drop .woff2/.woff/.ttf/.otf files or a .zip");
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    void handleFiles(Array.from(e.dataTransfer.files));
  };

  // Group rows by family name for the confirm step; empty family = "Untitled".
  const families = useMemo(() => {
    const m = new Map<string, MatchRow[]>();
    for (const r of rows) {
      const key = r.family.trim() || "Untitled";
      const bucket = m.get(key) ?? m.set(key, []).get(key)!;
      bucket.push(r);
    }
    return m;
  }, [rows]);

  const setRow = (mediaId: string, patch: Partial<MatchRow>) =>
    setRows((prev) => prev.map((r) => (r.mediaId === mediaId ? { ...r, ...patch } : r)));

  const createFamily = (name: string, group: MatchRow[]) => {
    start(async () => {
      const res = await createFamilyFromFaces({
        name,
        faces: group.map((g) => ({
          mediaId: g.mediaId,
          weight: g.weight,
          style: g.style,
          displayName: `${g.weight}${g.style === "italic" ? " Italic" : ""}`,
          unicodeRange: "",
          isVariable: g.meta?.isVariable ?? false,
        })),
      });
      if (res.ok) {
        onCreated({
          id: res.data!.familyId,
          name,
          source: "custom",
          status: "active",
          faces: group.map((g) => ({ id: g.mediaId, weight: g.weight, style: g.style, sizeBytes: g.sizeBytes, ext: g.ext })),
        });
        setRows((prev) => prev.filter((r) => !group.some((g) => g.mediaId === r.mediaId)));
      } else setErr(res.error);
    });
  };

  return (
    <div>
      <div
        className={`${styles.dropzone} ${drag ? styles.dropOn : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => fileInput.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={fileInput}
          type="file"
          multiple
          accept=".woff2,.woff,.ttf,.otf,.zip"
          style={{ display: "none" }}
          onChange={(e) => e.target.files && void handleFiles(Array.from(e.target.files))}
        />
        <p className={styles.dropTitle}>{busy ? "Reading files…" : "Drag font files, a folder, or a .zip here"}</p>
        <p className={styles.dropHint}>woff2 recommended · woff / ttf / otf accepted · or click to choose</p>
      </div>

      {err ? <p className={styles.err}>{err}</p> : null}

      {rows.length > 0 ? (
        <div className={styles.match}>
          <p className={styles.matchIntro}>
            We detected these fonts. Adjust the family, weight, and style if needed, then create each family.
          </p>
          {[...families.entries()].map(([name, group]) => (
            <Section key={name} title={name === "Untitled" ? "Untitled family" : name}>
              <table className={styles.matchTable}>
                <thead>
                  <tr><th>File</th><th>Family</th><th>Weight</th><th>Style</th></tr>
                </thead>
                <tbody>
                  {group.map((r) => (
                    <tr key={r.mediaId}>
                      <td className={styles.fileCell}>{r.fileName}{r.meta?.isVariable ? " · variable" : ""}</td>
                      <td><Input value={r.family} onChange={(e) => setRow(r.mediaId, { family: e.target.value })} /></td>
                      <td>
                        <Select value={String(r.weight)} onChange={(e) => setRow(r.mediaId, { weight: Number(e.target.value) })}>
                          {WEIGHT_LABELS.map(([w, l]) => <option key={w} value={w}>{w} · {l}</option>)}
                        </Select>
                      </td>
                      <td>
                        <Select value={r.style} onChange={(e) => setRow(r.mediaId, { style: e.target.value as "normal" | "italic" })}>
                          <option value="normal">Normal</option>
                          <option value="italic">Italic</option>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Row label="">
                <Button
                  variant="accent"
                  size="sm"
                  loading={pending}
                  disabled={!group[0]?.family.trim()}
                  onClick={() => createFamily(group[0].family.trim() || "Untitled", group)}
                >
                  Create “{group[0]?.family.trim() || "Untitled"}” family
                </Button>
              </Row>
            </Section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

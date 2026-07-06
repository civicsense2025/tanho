"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/core/Button";
import { deleteFamily, type FamilyWithFaces } from "../actions";
import type { GoogleFontDef } from "../google";
import { fontPerfWarnings, type FontPerfWarning } from "../validation";
import { UploadTab } from "./UploadTab";
import { GoogleTab } from "./GoogleTab";
import { WEIGHT_LABELS } from "./weights";
import styles from "./fonts.module.css";

type Tab = "installed" | "upload" | "google";

/**
 * Fonts manager shell — three tabs: your installed families (with page-speed
 * warnings), file upload (drag/zip/folder → match → create), and Google Fonts
 * (self-hosted). Each tab owns its own flow; this shell holds the family list.
 */
export function FontsManager({
  initialFamilies,
  googleFonts,
}: {
  initialFamilies: FamilyWithFaces[];
  googleFonts: GoogleFontDef[];
}) {
  const [tab, setTab] = useState<Tab>(initialFamilies.length > 0 ? "installed" : "google");
  const [families, setFamilies] = useState(initialFamilies);
  const [flash, setFlash] = useState<string | null>(null);

  const added = (fam: FamilyWithFaces) => {
    setFamilies((prev) => [fam, ...prev]);
    setTab("installed");
    setFlash(`Added "${fam.name}"`);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs} role="tablist">
        {(["installed", "upload", "google"] as const).map((tb) => (
          <button
            key={tb}
            role="tab"
            aria-selected={tab === tb}
            className={`${styles.tab} ${tab === tb ? styles.tabOn : ""}`}
            onClick={() => setTab(tb)}
          >
            {tb === "installed" ? `Your fonts (${families.length})` : tb === "upload" ? "Upload files" : "Google Fonts"}
          </button>
        ))}
      </div>

      {flash ? <p className={styles.flash}>{flash}</p> : null}

      {tab === "installed" ? (
        <InstalledTab families={families} onChange={setFamilies} onFlash={setFlash} />
      ) : tab === "upload" ? (
        <UploadTab onCreated={added} />
      ) : (
        <GoogleTab googleFonts={googleFonts} onAdded={added} />
      )}
    </div>
  );
}

function InstalledTab({
  families,
  onChange,
  onFlash,
}: {
  families: FamilyWithFaces[];
  onChange: (next: FamilyWithFaces[]) => void;
  onFlash: (m: string) => void;
}) {
  const [pending, start] = useTransition();

  const warnings: FontPerfWarning[] = useMemo(
    () =>
      fontPerfWarnings({
        familyCount: families.length,
        faces: families.flatMap((f) => f.faces.map((x) => ({ ext: x.ext, sizeBytes: x.sizeBytes }))),
      }),
    [families],
  );

  const remove = (id: string, name: string) => {
    start(async () => {
      const res = await deleteFamily(id);
      if (res.ok) {
        onChange(families.filter((f) => f.id !== id));
        onFlash(`Removed "${name}"`);
      } else onFlash(res.error);
    });
  };

  if (families.length === 0) {
    return <p className={styles.empty}>No custom fonts yet. Add a Google font or upload your own files.</p>;
  }

  return (
    <div>
      {warnings.length > 0 ? (
        <div className={styles.warnBox}>
          <strong className={styles.warnTitle}>Page-speed notes</strong>
          <ul className={styles.warnList}>
            {warnings.map((w) => (
              <li key={w.code} className={w.level === "warn" ? styles.warnItem : styles.infoItem}>{w.message}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className={styles.okNote}>Your font setup looks lean. Nice.</p>
      )}

      <ul className={styles.familyList}>
        {families.map((fam) => {
          const kb = Math.round(fam.faces.reduce((s, x) => s + x.sizeBytes, 0) / 1024);
          return (
            <li key={fam.id} className={styles.familyCard}>
              <div className={styles.familyHead}>
                <span className={styles.familyName} style={{ fontFamily: `"${fam.name}"` }}>{fam.name}</span>
                <span className={styles.familyMeta}>
                  {fam.source === "google" ? "Google · self-hosted" : "Uploaded"} · {fam.faces.length} face(s) · ~{kb} KB
                </span>
                <span style={{ flex: 1 }} />
                <Button variant="ghost" size="sm" onClick={() => remove(fam.id, fam.name)} loading={pending}>Remove</Button>
              </div>
              <div className={styles.faceChips}>
                {fam.faces
                  .slice()
                  .sort((a, b) => a.weight - b.weight)
                  .map((f) => (
                    <span key={f.id} className={styles.faceChip}>
                      {WEIGHT_LABELS.find(([w]) => w === f.weight)?.[1] ?? f.weight}
                      {f.style === "italic" ? " Italic" : ""}
                    </span>
                  ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

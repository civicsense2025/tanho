"use client";

import { useState } from "react";
import { Button } from "@/components/core/Button";
import { Input } from "@/components/forms/Input";
import { addGoogleFont, type FamilyWithFaces } from "../actions";
import type { GoogleFontDef } from "../google";
import { WEIGHT_LABELS } from "./weights";
import styles from "./fonts.module.css";

/** Browse the curated Google Fonts list, pick weights/styles, self-host them. */
export function GoogleTab({
  googleFonts,
  onAdded,
}: {
  googleFonts: GoogleFontDef[];
  onAdded: (fam: FamilyWithFaces) => void;
}) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<GoogleFontDef | null>(null);
  const [variants, setVariants] = useState<Set<string>>(new Set(["400:normal"]));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const needle = q.trim().toLowerCase();
  const list = googleFonts.filter((f) => !needle || f.family.toLowerCase().includes(needle));

  const toggle = (key: string) =>
    setVariants((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const add = async () => {
    if (!picked) return;
    setErr(null);
    setBusy(true);
    try {
      const variantList = [...variants].map((v) => {
        const [w, s] = v.split(":");
        return { weight: Number(w), style: s as "normal" | "italic" };
      });
      const res = await addGoogleFont({ family: picked.family, variants: variantList });
      if (res.ok && res.data) {
        // Render the faces the server actually created (some requested
        // variants can be unavailable), not the optimistic request list.
        onAdded(res.data);
      } else setErr(res.ok ? "No font faces were added" : res.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.google}>
      <div className={styles.googleList}>
        <Input placeholder="Search Google Fonts" value={q} onChange={(e) => setQ(e.target.value)} />
        <ul className={styles.gList}>
          {list.map((f) => (
            <li key={f.family}>
              <button
                className={`${styles.gItem} ${picked?.family === f.family ? styles.gItemOn : ""}`}
                onClick={() => { setPicked(f); setVariants(new Set(["400:normal"])); }}
              >
                <span className={styles.gName}>{f.family}</span>
                <span className={styles.gCat}>{f.category}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.googlePick}>
        {picked ? (
          <>
            <h3 className={styles.pickTitle}>{picked.family}</h3>
            <p className={styles.pickHint}>Choose the weights and styles to self-host (each is a separate file).</p>
            <div className={styles.variantGrid}>
              {picked.weights.map((w) =>
                (["normal", "italic"] as const)
                  .filter((s) => s === "normal" || picked.italic)
                  .map((s) => {
                    const key = `${w}:${s}`;
                    return (
                      <label key={key} className={styles.variant}>
                        <input type="checkbox" checked={variants.has(key)} onChange={() => toggle(key)} />
                        {WEIGHT_LABELS.find(([ww]) => ww === w)?.[1] ?? w}{s === "italic" ? " Italic" : ""}
                      </label>
                    );
                  }),
              )}
            </div>
            {err ? <p className={styles.err}>{err}</p> : null}
            <Button variant="accent" size="sm" loading={busy} disabled={variants.size === 0} onClick={add}>
              Add &amp; self-host {variants.size} file(s)
            </Button>
          </>
        ) : (
          <p className={styles.empty}>Pick a font on the left to choose its weights.</p>
        )}
      </div>
    </div>
  );
}

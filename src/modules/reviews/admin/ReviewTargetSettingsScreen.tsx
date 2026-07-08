"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Seg, Toggle } from "@/components/admin/Seg";
import { Button } from "@/components/core/Button";
import type { ReviewTargetConfig } from "../queries";
import { setReviewTargetConfig } from "../admin-actions";
import styles from "./reviews.module.css";

/** One target type + its resolved config + a human label. */
export type TargetTypeEntry = {
  targetType: string;
  label: string;
  config: ReviewTargetConfig;
};

/** Compact inline row editor for a single target type. */
function TargetRow({ entry }: { entry: TargetTypeEntry }) {
  const [enabled, setEnabled] = useState(entry.config.enabled);
  const [moderation, setModeration] = useState<"pre" | "post">(entry.config.moderation);
  const [verifiedGate, setVerifiedGate] = useState<"required" | "optional">(entry.config.verifiedGate);
  const [requireLogin, setRequireLogin] = useState(entry.config.requireLogin);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const changed =
    enabled !== entry.config.enabled ||
    moderation !== entry.config.moderation ||
    verifiedGate !== entry.config.verifiedGate ||
    requireLogin !== entry.config.requireLogin;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const showFlash = (ok: boolean, text: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMsg({ ok, text });
    timerRef.current = setTimeout(() => {
      setMsg(null);
      timerRef.current = null;
    }, 1600);
  };

  const save = () => {
    startTransition(async () => {
      const res = await setReviewTargetConfig({
        targetType: entry.targetType,
        enabled,
        moderation,
        verifiedGate,
        requireLogin,
        // Star ratings are managed in the federated hub marketplace; local
        // content-type reviews stay comment-only.
        allowRating: false,
        minRating: 0,
        maxRating: 5,
      });
      showFlash(res.ok, res.ok ? "Saved" : res.error ?? "Error");
    });
  };

  return (
    <div className={styles.settingsRow}>
      <div className={styles.settingsCell} data-label="Type">
        <div>
          <div className={styles.settingsLabel}>{entry.label}</div>
          <div className={styles.settingsType}>{entry.targetType}</div>
        </div>
      </div>
      <div className={styles.settingsCell} data-label="Enabled">
        <Toggle value={enabled} onChange={setEnabled} />
      </div>
      <div className={styles.settingsCell} data-label="Login">
        <Toggle value={requireLogin} onChange={setRequireLogin} />
      </div>
      <div className={styles.settingsCell} data-label="Moderation">
        <Seg
          value={moderation}
          onChange={(v) => setModeration(v as "pre" | "post")}
          options={[
            { value: "post", label: "Post" },
            { value: "pre", label: "Pre" },
          ]}
        />
      </div>
      <div className={styles.settingsCell} data-label="Verified">
        <Seg
          value={verifiedGate}
          onChange={(v) => setVerifiedGate(v as "required" | "optional")}
          options={[
            { value: "optional", label: "Optional" },
            { value: "required", label: "Required" },
          ]}
        />
      </div>
      <div className={styles.settingsCell} data-label=" ">
        <div className={styles.settingsSave}>
          <Button
            variant="accent"
            size="sm"
            onClick={save}
            loading={isPending}
            disabled={!changed}
          >
            Save
          </Button>
          {msg ? (
            <span
              className={styles.settingsMsg}
              style={{ color: msg.ok ? "var(--accent-2)" : "var(--danger)" }}
            >
              {msg.text}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Bird's-eye view of every local reviewable content type. */
export function ReviewTargetSettingsScreen({ entries }: { entries: TargetTypeEntry[] }) {
  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <Link href="/admin/reviews" className={styles.back}>
          ← Back to reviews
        </Link>
      </div>

      <div className={styles.headerRow}>
        <h1 className={styles.title}>Review settings</h1>
      </div>
      <p className={styles.subhead}>
        Enable reviews and set moderation rules for each local content type. Star ratings
        for packs and blocks are handled in the federated hub.
      </p>

      {entries.length === 0 ? (
        <div className={styles.faint}>No reviewable content types found.</div>
      ) : (
        <div className={styles.settingsTable}>
          <div className={styles.settingsHead}>
            <div className={styles.settingsHeadCell}>Type</div>
            <div className={styles.settingsHeadCell}>Enabled</div>
            <div className={styles.settingsHeadCell}>Login</div>
            <div className={styles.settingsHeadCell}>Moderation</div>
            <div className={styles.settingsHeadCell}>Verified</div>
            <div className={styles.settingsHeadCell} />
          </div>
          {entries.map((entry) => (
            <TargetRow key={entry.targetType} entry={entry} />
          ))}
        </div>
      )}
    </main>
  );
}

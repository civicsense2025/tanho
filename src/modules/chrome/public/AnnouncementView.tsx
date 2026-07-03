"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { AnnouncementConfig } from "../validation";
import { SmartLink } from "./SmartLink";
import styles from "./announcement.module.css";

/* Dismissal lives in localStorage, read as an external store: the server
   snapshot renders the bar, the client snapshot hides it post-hydration. */
let listeners: Array<() => void> = [];
const subscribe = (cb: () => void) => {
  listeners = [...listeners, cb];
  window.addEventListener("storage", cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
    window.removeEventListener("storage", cb);
  };
};
const readDismissed = (key: string) => {
  try {
    return Boolean(window.localStorage.getItem(key));
  } catch {
    return false;
  }
};
const writeDismissed = (key: string) => {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    /* storage unavailable — bar stays dismissible per-render only */
  }
  for (const l of listeners) l();
};

const TONES: Record<AnnouncementConfig["tone"], React.CSSProperties> = {
  ink: { background: "var(--ink-0)", color: "var(--paper-0)" },
  accent: { background: "var(--accent)", color: "var(--text-on-accent)" },
  accent2: { background: "var(--accent-2)", color: "var(--text-on-accent)" },
  paper: { background: "var(--surface)", color: "var(--text)" },
};

const barStyle = (config: AnnouncementConfig): React.CSSProperties => {
  if (config.style === "gradient") {
    return {
      background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
      color: "var(--text-on-accent)",
    };
  }
  if (config.style === "outline") {
    return { background: "var(--bg)", color: "var(--text)", borderBottom: "1px solid var(--border)" };
  }
  return TONES[config.tone];
};

const Cta = ({ message }: { message: AnnouncementConfig["messages"][number] }) =>
  message.cta?.label && message.cta.url ? (
    <SmartLink href={message.cta.url} className={styles.cta}>
      {message.cta.label} <span aria-hidden>→</span>
    </SmartLink>
  ) : null;

/**
 * Announcement bar body — rotation + dismissal are client concerns.
 * `preview` (admin) ignores stored dismissals so the editor stays visible.
 */
export function AnnouncementView({
  config,
  preview = false,
}: {
  config: AnnouncementConfig;
  preview?: boolean;
}) {
  const messages = config.messages.filter((m) => m.text);
  const key = `oys.announce.${JSON.stringify(config.messages).length}.${config.messages[0]?.text ?? ""}`;
  const dismissed = useSyncExternalStore(
    subscribe,
    () => readDismissed(key),
    () => false,
  );
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (messages.length < 2 || config.style === "marquee") return;
    const t = setInterval(() => setIdx((i) => (i + 1) % messages.length), config.rotateMs);
    return () => clearInterval(t);
  }, [messages.length, config.rotateMs, config.style]);

  if ((dismissed && !preview) || messages.length === 0) return null;

  const dismissBtn = config.dismissible ? (
    <button
      type="button"
      className={styles.close}
      aria-label="Dismiss"
      onClick={preview ? undefined : () => writeDismissed(key)}
    >
      ✕
    </button>
  ) : null;

  if (config.style === "marquee") {
    const run = messages.map((m) => m.text).join(" · ");
    return (
      <div className={styles.bar} style={barStyle(config)}>
        <div className={styles.marqueeWrap} aria-label={run}>
          <div className={styles.marqueeTrack} aria-hidden>
            <span className={styles.marqueeItem}>{run}</span>
            <span className={styles.marqueeItem}>{run}</span>
          </div>
        </div>
        {dismissBtn}
      </div>
    );
  }

  const msg = messages[idx % messages.length];
  return (
    <div className={styles.bar} style={barStyle(config)}>
      <div key={idx} className={`${styles.inner} ${styles.fade}`}>
        <span>{msg.text}</span>
        <Cta message={msg} />
      </div>
      {dismissBtn}
    </div>
  );
}
